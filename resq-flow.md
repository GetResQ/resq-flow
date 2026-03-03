# resq-flow: Real-Time Flow Visualization for ResQ Agent

## Context & Motivation

ResQ Agent has a complex, multi-stage email processing pipeline (and future flows like Nora chat) with queues, workers, cron schedulers, S3, and Postgres — all emitting OpenTelemetry traces via the `tracing` + `tracing-opentelemetry` crates. Today, debugging during live e2e tests means writing LogsQL/MetricsQL queries against Victoria Logs/Traces — powerful but not visual.

**resq-flow** is a local dev tool that renders an interactive architecture diagram (React Flow) where nodes glow, edges animate, and log tickers update in real-time as OTEL spans and structured log events flow through the system. It's designed to be **generic and extensible** — each "flow" is a pure data config file; adding a new flow (mail pipeline, Nora chat, voice, etc.) means adding a file, not writing components.

**This is a dev-only tool.** It never deploys to production. It runs on the developer's laptop alongside `make dev-mail` / `make dev-all`.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Relay server** | Rust (Axum + tokio-tungstenite) | Consistent with codebase. Receives OTLP HTTP, broadcasts via WebSocket |
| **Frontend** | Vite + React 19 + TypeScript | Single-page dev tool. No SSR/routing needed. Vite is fast & minimal |
| **Diagram engine** | React Flow v12 | MIT-licensed, custom nodes are React components, animated edges built-in |
| **Styling** | Tailwind CSS v4 | Quick utility styling, matches team familiarity |
| **Package manager** | bun | Already used in resq-agent's package.json |

---

## Project Structure

```
resq-flow/                          ← NEW standalone repo (sibling to resq-agent)
├── relay/                          ← Rust WebSocket relay
│   ├── Cargo.toml
│   ├── src/
│   │   └── main.rs                 ← Axum server: OTLP HTTP in → WebSocket broadcast out
│   └── tests/
│       ├── otlp_to_ws.rs           ← POST OTLP traces → assert WebSocket receives FlowEvent
│       ├── otlp_logs.rs            ← POST OTLP logs → assert mail_e2e_event filtering works
│       └── ws_broadcast.rs         ← Multi-client broadcast + disconnect resilience
│
├── ui/                             ← Vite + React + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                ← Entry point
│       ├── App.tsx                 ← Flow selector dropdown + React Flow canvas + log panel
│       │
│       ├── core/                   ← Generic, reusable — no flow-specific logic
│       │   ├── types.ts            ← FlowConfig, NodeConfig, EdgeConfig, SpanMapping types
│       │   ├── nodes/              ← Generic shape-based primitives (NOT domain-specific)
│       │   │   ├── index.ts        ← nodeTypes registry export
│       │   │   ├── RectangleNode.tsx   ← Standard box — general purpose (workers, steps, etc.)
│       │   │   ├── RoundedRectNode.tsx ← Softer box — queues, grouped steps, containers
│       │   │   ├── DiamondNode.tsx     ← Rotated square — decisions, branches, conditionals
│       │   │   ├── CircleNode.tsx      ← Circle — infrastructure (S3, Postgres, Redis, etc.)
│       │   │   ├── PillNode.tsx        ← Capsule/pill — triggers, entry points, external events
│       │   │   ├── BadgeNode.tsx       ← Compact tag/chip — enqueue labels, small status markers
│       │   │   ├── OctagonNode.tsx     ← Stop sign — halt/blocking/await states
│       │   │   ├── GroupNode.tsx       ← Dashed boundary — system boundaries (e.g., "RESQ-AGENT")
│       │   │   └── AnnotationNode.tsx  ← Text-only — notes, terms, legends
│       │   ├── edges/
│       │   │   ├── index.ts        ← edgeTypes registry export
│       │   │   ├── AnimatedEdge.tsx ← Solid line with traveling particle on activity
│       │   │   └── DashedEdge.tsx   ← Dashed line (optional triggers, async flows)
│       │   ├── hooks/
│       │   │   ├── useRelayConnection.ts  ← WebSocket to relay, reconnect logic
│       │   │   ├── useFlowAnimations.ts   ← Maps incoming spans to node/edge state + durations
│       │   │   ├── useLogStream.ts        ← Full session log history per node + global
│       │   │   └── useTraceTimeline.ts    ← Span durations + parent-child waterfall per node
│       │   └── components/
│       │       ├── FlowCanvas.tsx         ← React Flow wrapper with zoom/pan/minimap
│       │       ├── LogPanel.tsx           ← Global live tail sidebar: all events, filterable
│       │       ├── NodeDetailPanel.tsx    ← Per-node panel: Logs tab + Traces/waterfall tab
│       │       ├── FlowSelector.tsx       ← Top bar: flow dropdown, connection status, clear session
│       │       ├── NodeStatusBadge.tsx    ← Shared idle/active/success/error indicator
│       │       └── DurationBadge.tsx      ← Inline duration display (color-coded by threshold)
│       │
│       ├── flows/                  ← Pure config — one file per flow, no components
│       │   ├── index.ts            ← Re-exports all flows for FlowSelector
│       │   └── mail-pipeline.ts    ← Mail pipeline: nodes, edges, positions, spanMapping
│       │
│       └── test/                   ← Test fixtures + replay scripts
│           ├── fixtures/
│           │   └── mail-pipeline-replay.json  ← Full pipeline FlowEvent sequence (happy + error path)
│           ├── replay.ts                      ← Sends fixtures to relay via WebSocket (bun run replay)
│           └── replay-direct.ts               ← Feeds fixtures directly into UI hooks (bun run replay:direct)
│
├── README.md
└── Makefile                        ← `make dev` starts both relay + ui
```

---

## Phase 1: Relay Server (Rust)

### Purpose
Receives OTLP HTTP spans + logs from the OTEL Collector (or directly from resq-agent) and broadcasts them to connected browser clients via WebSocket.

### Implementation

**File: `relay/src/main.rs`** (~200 lines)

```
Dependencies (Cargo.toml):
  axum = "0.8"
  axum-extra = { version = "0.10", features = ["typed-header"] }
  tokio = { version = "1", features = ["full"] }
  tokio-tungstenite = "0.26"
  serde = { version = "1", features = ["derive"] }
  serde_json = "1"
  tower-http = { version = "0.6", features = ["cors"] }
  tracing = "0.1"
  tracing-subscriber = "0.3"
```

**Routes:**
1. `POST /v1/traces` — Receives OTLP JSON export (ExportTraceServiceRequest). Parses spans, extracts: span name, service name, attributes (function_name, queue_name, job_id, action, status, outcome, worker_name, etc.), start/end time. Broadcasts a simplified `FlowEvent` JSON to all connected WebSocket clients.
2. `POST /v1/logs` — Receives OTLP JSON log export. Filters for `event = "mail_e2e_event"` structured logs. Extracts fields and broadcasts as `FlowEvent`.
3. `GET /ws` — WebSocket upgrade. Adds client to broadcast list. Sends heartbeat pings. Removes on disconnect.
4. `GET /health` — Health check.

**FlowEvent schema** (broadcast to browser):
```json
{
  "type": "span_start | span_end | log",
  "timestamp": "2026-03-03T12:00:00.123Z",
  "span_name": "rrq.enqueue",
  "service_name": "resq-mail-worker",

  "trace_id": "abc123def456...",
  "span_id": "1234abcd",
  "parent_span_id": "5678efgh",

  "start_time": "2026-03-03T12:00:00.123Z",
  "end_time": "2026-03-03T12:00:01.345Z",
  "duration_ms": 1222,

  "attributes": {
    "function_name": "handle_mail_extract",
    "queue_name": "rrq:queue:mail-analyze",
    "job_id": "abc-123",
    "action": "enqueue",
    "status": "ok",
    "outcome": "success",
    "worker_name": "mail_extract",
    "mailbox_owner": "vendor@example.com",
    "attempt": 1,
    "error_type": null,
    "error_message": null
  },
  "message": "rrq:queue:mail-analyze: job enqueued (handle_mail_extract)"
}
```

The relay extracts trace context from OTLP span data:
- `trace_id` and `span_id` from the OTLP Span message
- `parent_span_id` from the Span's parent_span_id field
- `start_time` / `end_time` from Span's start_time_unix_nano / end_time_unix_nano
- `duration_ms` computed as `(end_time - start_time) / 1_000_000`

This gives the frontend everything it needs to:
1. Show **duration badges** on nodes (from `duration_ms`)
2. Build **per-node waterfall timelines** (from trace_id + span_id + parent_span_id + timing)
3. Reconstruct **full trace trees** across nodes (group spans by trace_id, nest by parent_span_id)

**Port:** `4200` (avoids collision with existing services — 4318 is OTEL Collector, 8001 is backend, 9000+ are runners).

**Broadcast strategy:** `tokio::sync::broadcast` channel. Each WebSocket connection subscribes. If a client is slow, messages are dropped (lagging receiver) — acceptable for a dev tool.

### OTEL Collector Config Change

To fan out traces/logs to both Victoria AND the relay, add a second exporter in the Vector config (or a local OTEL Collector overlay):

```yaml
# Option A: If using OTEL Collector directly
exporters:
  otlphttp/victoria:
    endpoint: http://localhost:4318
  otlphttp/resq-flow:
    endpoint: http://localhost:4200

service:
  pipelines:
    traces:
      exporters: [otlphttp/victoria, otlphttp/resq-flow]
    logs:
      exporters: [otlphttp/victoria, otlphttp/resq-flow]
```

```yaml
# Option B: resq-agent sends directly to relay (simplest for local dev)
# Set env var: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4200/v1/traces
# The relay then acts as the sole receiver (skip Victoria for dev)
```

**Recommendation:** Option B for simplicity during local dev. The relay is the OTLP endpoint. If you also want Victoria, use Option A.

---

## Phase 2: Frontend Core (`ui/src/core/`)

### 2a. Type System (`core/types.ts`)

```typescript
// Generic shape primitives — these are SHAPES, not domain concepts.
// Flow configs compose these shapes + styling to represent domain-specific elements.
type NodeShape =
  | 'rectangle'      // Standard box (workers, process steps, anything)
  | 'roundedRect'    // Softer box (queues, grouped steps)
  | 'diamond'        // Decision/branch/conditional
  | 'circle'         // Infrastructure/service (S3, Postgres, Redis)
  | 'pill'           // Trigger/entry point/external event
  | 'badge'          // Compact tag/chip (enqueue labels, small status markers)
  | 'octagon'        // Stop sign / halt / blocking / await state
  | 'group'          // Dashed boundary container
  | 'annotation';    // Floating text (no border, no handles)

// Style configuration — each flow config styles generic shapes however it wants
interface NodeStyle {
  color?: string;              // Theme color: 'yellow' | 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple' | string
  icon?: string;               // Optional icon identifier: 'worker' | 'queue' | 's3' | 'postgres' | 'redis' | 'cron' | 'bot' | etc.
  borderStyle?: 'solid' | 'dashed';
}

interface FlowNodeConfig {
  id: string;                          // Unique node ID (used in spanMapping)
  type: NodeShape;                     // Which generic shape to render
  label: string;                       // Primary label
  sublabel?: string;                   // Secondary text (e.g., "1 worker at a time")
  bullets?: string[];                  // Bullet points inside the node
  style?: NodeStyle;                   // Visual customization (color, icon, border)
  position: { x: number; y: number };  // React Flow position
  size?: { width: number; height: number }; // Optional size override
  parentId?: string;                   // For nodes inside a GroupNode
}

interface FlowEdgeConfig {
  id: string;
  source: string;                      // Source node ID
  target: string;                      // Target node ID
  sourceHandle?: string;               // Handle position (top/bottom/left/right)
  targetHandle?: string;
  label?: string;                      // Edge label (e.g., "action = skip")
  type?: 'animated' | 'dashed';        // Edge style (default: animated)
  animated?: boolean;                  // Always-on animation (e.g., dashed marching ants)
}

// Maps OTEL span/log attributes → node IDs
interface SpanMapping {
  // Key: match pattern (attribute value), Value: node ID to highlight
  // Matching logic: check span_name, then attributes.function_name, then attributes.queue_name, then attributes.worker_name
  [pattern: string]: string;
}

interface FlowConfig {
  id: string;                          // Unique flow ID
  name: string;                        // Display name in selector
  description?: string;                // Optional description
  nodes: FlowNodeConfig[];
  edges: FlowEdgeConfig[];
  spanMapping: SpanMapping;
}
```

### 2b. Generic Shape Node Components (`core/nodes/`)

These are **shape primitives**, not domain concepts. Each flow config uses these shapes and
applies styling (color, icon, bullets) via the `style` and data props in `FlowNodeConfig`.

All shape nodes (except GroupNode and AnnotationNode) share:
- A `status` state: `'idle' | 'active' | 'success' | 'error'`
- CSS transition-driven glow animation (border color + box-shadow based on `style.color`)
- A small log ticker area (last 1-2 messages, toggleable)
- A `NodeStatusBadge` indicator
- Configurable handles (top/bottom/left/right, specified per-node in flow config)

**RectangleNode.tsx** — Standard rectangular box
- Renders: label (title), optional sublabel, optional bullet list, optional icon (from `style.icon`)
- Border + background tinted by `style.color`
- Use cases: workers, process steps, function calls, any general-purpose block
- Default handles: top (input), bottom (output)

**RoundedRectNode.tsx** — Rounded-corner rectangle
- Same content rendering as RectangleNode but with `border-radius: 12px`
- Visually softer — use for queues, grouped operations, containers
- Can show a counter badge (e.g., queue depth) via optional `counter` data prop
- Default handles: top (input), bottom (output)

**DiamondNode.tsx** — Diamond / rhombus shape
- CSS rotated square (45deg) with counter-rotated inner content
- Shows condition label centered
- Multiple output handles on each corner for branches
- Default handles: top (input), left (output), right (output), bottom (output)

**CircleNode.tsx** — Circle
- Icon + label rendered inside circle
- `style.icon` determines which icon to show (s3, postgres, redis, external, etc.)
- Smaller text label below the icon
- Subtle glow on activity
- Default handles: top, bottom, left, right (all bidirectional)

**PillNode.tsx** — Capsule / pill shape
- Fully rounded ends (`border-radius: 50vh`)
- Compact, single-line label
- Good for triggers, entry points, external events, status tags
- Default handles: right (output) — typically flow starts here

**BadgeNode.tsx** — Compact tag / chip
- Small, dark background, rounded corners, minimal padding
- Single-line label, small font
- No log ticker, no bullets — just a label + status glow
- Used for: enqueue operations, small status markers, annotations with handles
- Default handles: top (input), bottom (output)

**OctagonNode.tsx** — Octagon (stop sign shape)
- CSS `clip-path: polygon(...)` for octagonal shape
- Prominent label, bold styling
- Red/orange default theme — signals halt, blocking, await states
- Used for: "STOP — await human review", error states, manual intervention points
- Default handles: top (input), left (output), right (output)

**GroupNode.tsx** — Dashed border container
- Large area with dashed border
- Label in top-left corner
- No handles, no status, no glow — purely visual grouping
- Children nodes use `parentId` to be positioned inside
- Background: semi-transparent tint from `style.color`

**AnnotationNode.tsx** — Borderless text block
- No border, no background, no handles, no status
- Renders multi-line text (supports basic markdown: bold, lists)
- Used for: terms/legends/notes, explanatory text on the diagram

### 2c. Edge Components (`core/edges/`)

**AnimatedEdge.tsx**
- Default edge type
- Solid line when idle
- When a span indicates flow between source→target: an SVG circle particle travels along the edge path over 600ms
- Uses `getBezierPath` from React Flow + CSS `offset-path` animation

**DashedEdge.tsx**
- Dashed stroke pattern
- For optional/async connections
- Marching ants animation when active

### 2d. Hooks (`core/hooks/`)

**useRelayConnection.ts**
- Connects to `ws://localhost:4200/ws`
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 10s)
- Parses incoming `FlowEvent` JSON
- Returns: `{ events: FlowEvent[], connected: boolean, reconnecting: boolean }`

**useFlowAnimations.ts**
- Takes: `flowConfig.spanMapping`, `events` from useRelayConnection
- For each incoming event, matches against spanMapping to find target node ID
- Maintains a `Map<nodeId, NodeStatus>` with timers:
  - `span_start` → set node to `'active'`, record start timestamp
  - `span_end` with success → set to `'success'`, compute duration, auto-clear to `'idle'` after 3s
  - `span_end` with error → set to `'error'`, stay red until next activity
  - `log` with action=enqueue → pulse queue node, increment counter
  - `log` with action=worker_pickup → pulse worker node, decrement queue counter
- **Duration tracking:** When a span ends, computes `duration_ms` from start/end or from the `duration_ms` attribute in `mail_e2e_event`. Stores on the node status so nodes can display "1.2s" badge.
- Returns: `{ nodeStatuses: Map<string, NodeStatus>, activeEdges: Set<string> }`

**useLogStream.ts**
- Maintains **full session history** per node (not a ring buffer — keeps everything for the session so logs are reviewable after the run completes)
- Global log list: all events across all nodes, ordered by timestamp
- Per-node log list: `Map<string, LogEntry[]>` — each node's events in order
- Each `LogEntry` includes: timestamp, level (info/error), message, status (ok/error), duration_ms (if available), raw attributes
- Returns: `{ globalLogs: LogEntry[], nodeLogMap: Map<string, LogEntry[]>, clearSession: () => void }`
- `clearSession()` resets all logs (called when switching flows or manually)

**useTraceTimeline.ts**
- Tracks **span durations and parent-child relationships** per node
- When a `span_start` event arrives: opens a span entry `{ spanName, startTime, nodeId, traceId, parentSpanId }`
- When a `span_end` event arrives: closes the span entry with `endTime` and `duration_ms`
- Groups spans by node ID → builds a **mini waterfall/timeline** per node
- Returns: `{ nodeSpans: Map<string, SpanEntry[]>, traceTree: Map<traceId, SpanEntry[]> }`
- `SpanEntry`: `{ spanName, nodeId, traceId, spanId, parentSpanId, startTime, endTime, durationMs, status, attributes }`

### 2e. UI Components (`core/components/`)

**FlowCanvas.tsx**
- Wraps `<ReactFlow>` with:
  - Custom `nodeTypes` and `edgeTypes` registries
  - MiniMap (bottom-right)
  - Controls (zoom in/out/fit)
  - Background dots pattern
- Receives `FlowConfig` and renders nodes/edges
- Passes `nodeStatuses`, `activeEdges`, `nodeLogMap`, `nodeSpans` down via React context
- Click a node → opens NodeDetailPanel for that node

**LogPanel.tsx** — Global log sidebar
- Right sidebar (collapsible, ~350px wide)
- Shows **live tail** of all events across all nodes, most recent at top
- Filter by: node (click a node to filter), level (info/error/all), search text
- Each log entry: timestamp, node label (color-coded pill), message, duration if available, status icon (green check / red X)
- **Live mode:** auto-scrolls as events arrive. If user scrolls up, shows "Live tail paused — click to resume" indicator at bottom
- **After run:** all logs remain. Scroll freely. Click any log entry to highlight its node on the canvas.

**NodeDetailPanel.tsx** — Per-node log + trace panel
- Opens when you click a node on the canvas (replaces or stacks with LogPanel)
- **Header:** Node label, current status badge, total event count, last duration
- **Tabs:**
  - **Logs tab:** Live tail of that node's events only. Same format as LogPanel but filtered to this node.
    Shows: enqueue → worker_pickup → worker_result (success/error) with timestamps and durations.
    Color-coded: green rows for success, red for error, gray for info.
  - **Traces tab:** Mini waterfall/timeline of spans for this node.
    Each span shown as a horizontal bar: `|===== fetch_gmail_api (800ms) =====|`
    Bars are proportional to duration. Nested spans indented under parents.
    Shows the last N traces (configurable, default 5). Click a trace to expand full detail.
  - **Attributes tab:** Raw JSON attributes from the last event (for debugging span mapping issues)
- **Close button** or click canvas background to dismiss

**FlowSelector.tsx**
- Top bar with:
  - Flow dropdown (pick which flow to display)
  - Connection status indicator (green dot = connected to relay, red = disconnected)
  - "Clear session" button (resets all logs/traces/node states)
  - Event counter: "142 events" — total events received this session
- Switching flow resets all node states, logs, and traces

**NodeStatusBadge.tsx**
- Shared component used inside all node types
- Small colored dot: gray (idle), pulsing blue (active), green (success), red (error)
- When a span ends: shows duration text next to badge (e.g., "1.2s") that fades after 5s
- CSS keyframe animations for pulse effect

**DurationBadge.tsx**
- Small inline badge showing span duration: "1.2s", "340ms", "3.1s"
- Color-coded: green (<1s), yellow (1-5s), red (>5s) — thresholds configurable
- Shown on worker/process nodes after span completion
- Fades to subtle after 5s but remains visible on hover

---

## Phase 3: Mail Pipeline Flow Config (`flows/mail-pipeline.ts`)

This is the first flow definition. **Pure data, no components.**

### Nodes (mapped from the Excalidraw diagram)

Each node uses a **generic shape** + **style** props. The shape determines the visual form;
the style (color, icon) gives it domain-specific meaning.

```
ID                          | Shape       | Label                                    | Style                          | Position (approx)
----------------------------|-------------|------------------------------------------|--------------------------------|------------------
fullstack-group             | group       | FULLSTACK                                | color: 'gray'                  | x:0, y:0
resq-agent-group            | group       | RESQ-AGENT                               | color: 'gray'                  | x:200, y:0
trigger-oauth               | pill        | Vendor email account connected            | color: 'green'                 | x:20, y:60
batchfill-queue             | roundedRect | rrq:queue:mail-batchfill                 | color: 'yellow', icon: 'queue' | x:350, y:40
batchfill-worker            | rectangle   | mail_batchfill                           | color: 'blue', icon: 'worker'  | x:350, y:140
cron-scheduler              | roundedRect | rpq cron — handle_mail_cron_tick (1min)  | color: 'gray', icon: 'cron'    | x:250, y:220
incoming-queue              | roundedRect | rrq:queue:mail-incoming                  | color: 'yellow', icon: 'queue' | x:350, y:310
incoming-worker             | rectangle   | mail_incoming                            | color: 'blue', icon: 'worker'  | x:350, y:410
check-process               | roundedRect | handle_checking_check                    | color: 'gray'                  | x:200, y:500
s3                          | circle      | S3                                       | color: 'blue', icon: 's3'      | x:600, y:350
postgres-main               | circle      | Postgres                                 | color: 'blue', icon: 'postgres'| x:450, y:450
write-threads               | roundedRect | write new mail threads to S3             | color: 'blue'                  | x:500, y:400
extract-enqueue             | badge       | enqueue handle_mail_extract              | color: 'gray'                  | x:500, y:500
analyze-enqueue             | badge       | enqueue handle_mail_analyze_reply        | color: 'gray'                  | x:500, y:550
analyze-queue               | roundedRect | rrq:queue:mail-analyze                   | color: 'yellow', icon: 'queue' | x:700, y:470
analyze-worker              | rectangle   | mail_analyze                             | color: 'blue', icon: 'worker'  | x:700, y:560
analyze-decision            | diamond     | action?                                  | color: 'orange'                | x:700, y:660
skip-node                   | rectangle   | skip                                     | color: 'gray'                  | x:830, y:620
draft-reply                 | rectangle   | Insert reply draft into mail_reply_drafts| color: 'orange'                | x:650, y:760
autosend-decision           | diamond     | Autosend?                                | color: 'orange'                | x:650, y:860
stop-review                 | octagon     | STOP — await human review                | color: 'red'                   | x:800, y:830
set-sending                 | rectangle   | set status = 'sending', enqueue SendReply| color: 'blue'                  | x:650, y:960
extract-queue               | roundedRect | rrq:queue:mail-extract                   | color: 'yellow', icon: 'queue' | x:950, y:470
extract-worker              | rectangle   | mail_extract                             | color: 'blue', icon: 'worker'  | x:950, y:560
run-extract                 | rectangle   | run_extract()                            | color: 'blue'                  | x:950, y:650
extract-success             | diamond     | success?                                 | color: 'orange'                | x:950, y:740
record-extract-state        | rectangle   | record_extract_state                     | color: 'gray'                  | x:950, y:830
upsert-contacts             | badge       | upsert_contact(s) to mail_extracted...   | color: 'blue'                  | x:1050, y:740
postgres-extract            | circle      | Postgres                                 | color: 'blue', icon: 'postgres'| x:1100, y:830
send-queue                  | roundedRect | rrq:queue:mail-send                      | color: 'yellow', icon: 'queue' | x:650, y:1050
send-worker                 | rectangle   | mail_send                                | color: 'blue', icon: 'worker'  | x:650, y:1140
send-process                | rectangle   | handle_mail_send_reply                   | color: 'blue'                  | x:650, y:1230
send-outcome                | diamond     | sent/send_failed/stale?                  | color: 'orange'                | x:600, y:1340
retry-node                  | badge       | retry                                    | color: 'orange'                | x:750, y:1340
terms-annotation            | annotation  | TERMS: mail thread = gmail conversation..| —                              | x:750, y:150
```

**Note:** Exact x/y positions will need visual iteration. The above are starting approximations to match the diagram's spatial layout.

### Edges

```
Source → Target                              | Label                  | Type
---------------------------------------------|------------------------|--------
trigger-oauth → batchfill-queue              |                        | dashed
batchfill-queue → batchfill-worker           |                        | animated
cron-scheduler → incoming-queue              | enqueue                | animated
incoming-queue → incoming-worker             |                        | animated
incoming-worker → check-process              |                        | animated
incoming-worker → write-threads              |                        | animated
write-threads → s3                           |                        | animated
write-threads → postgres-main               | write metadata         | animated
check-process → postgres-main               |                        | animated
incoming-worker → extract-enqueue            |                        | animated
incoming-worker → analyze-enqueue            |                        | animated
extract-enqueue → extract-queue              |                        | animated
analyze-enqueue → analyze-queue              |                        | animated
analyze-queue → analyze-worker               |                        | animated
analyze-worker → analyze-decision            |                        | animated
analyze-decision → skip-node                 | action = skip          | dashed
analyze-decision → draft-reply               | action = draft_reply   | animated
draft-reply → autosend-decision              |                        | animated
autosend-decision → stop-review              | no → elo = 0           | dashed
autosend-decision → set-sending              | yes                    | animated
set-sending → send-queue                     |                        | animated
extract-queue → extract-worker               |                        | animated
extract-worker → run-extract                 |                        | animated
run-extract → extract-success                |                        | animated
extract-success → record-extract-state       | success                | animated
extract-success → upsert-contacts            | success + contacts     | animated
upsert-contacts → postgres-extract           |                        | animated
record-extract-state → postgres-extract      |                        | animated
send-queue → send-worker                     |                        | animated
send-worker → send-process                   |                        | animated
send-process → send-outcome                  |                        | animated
send-outcome → retry-node                    | retry                  | dashed
stop-review → send-queue                     | status = needs_review  | dashed
```

### Span Mapping

Maps OTEL attributes to node IDs. The relay sends `FlowEvent` objects; the frontend checks attributes in priority order: `span_name` → `function_name` → `queue_name` → `worker_name` → `action`.

```typescript
export const spanMapping: SpanMapping = {
  // Enqueue spans (rrq.enqueue with queue_name attribute)
  'rrq:queue:mail-backfill':    'batchfill-queue',    // queue_name match
  'rrq:queue:mail-incoming':    'incoming-queue',
  'rrq:queue:mail-analyze':     'analyze-queue',
  'rrq:queue:mail-extract':     'extract-queue',
  'rrq:queue:mail-send':        'send-queue',

  // Worker function spans (function_name attribute from mail_e2e_event)
  'handle_mail_backfill_start': 'batchfill-worker',
  'handle_mail_backfill_chunk': 'batchfill-worker',
  'handle_mail_incoming_check': 'incoming-worker',
  'handle_mail_analyze_reply':  'analyze-worker',
  'handle_mail_extract':        'extract-worker',
  'handle_mail_send_reply':     'send-worker',
  'handle_mail_cron_tick':      'cron-scheduler',

  // Worker name spans (worker_name attribute from mail_e2e_event)
  'mail_batchfill':             'batchfill-worker',
  'mail_incoming':              'incoming-worker',
  'mail_analyze':               'analyze-worker',
  'mail_extract':               'extract-worker',
  'mail_send':                  'send-worker',

  // E2E event actions
  'threads_written':            'write-threads',
  'metadata_written':           'postgres-main',
  'cursor_updated':             'check-process',
};
```

---

## Phase 4: Integration & Dev Workflow

### Makefile

```makefile
# resq-flow/Makefile
.PHONY: dev dev-relay dev-ui

dev:                          ## Start both relay + UI
	@make -j2 dev-relay dev-ui

dev-relay:                    ## Start Rust WebSocket relay
	cd relay && cargo run

dev-ui:                       ## Start Vite dev server
	cd ui && bun run dev
```

### How to use with resq-agent

1. Start shared observability: `cd ~/Code/resq-fullstack && make shared`
2. Start resq-agent: `cd ~/Code/resq-agent && make dev-mail`
3. Start resq-flow: `cd ~/Code/resq-flow && make dev`
4. Open browser: `http://localhost:5173`
5. Set OTEL endpoint to relay (or configure Vector to fan out):
   - Simplest: `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4200/v1/traces`
   - Or: add `otlphttp/resq-flow` exporter to Vector config

### No changes to resq-agent required

The relay receives standard OTLP HTTP. The existing traces and `mail_e2e_event` structured logs already contain all the attributes needed for span mapping.

---

## Implementation Order

### Step 1: Scaffold project
- Initialize `resq-flow/` repo
- `relay/`: `cargo init`, add Axum + tokio + serde deps
- `ui/`: `bun create vite` with React + TypeScript template, add react-flow, tailwind

### Step 2: Relay server
- Implement OTLP JSON receiver (`POST /v1/traces`, `POST /v1/logs`)
- Implement WebSocket broadcast (`GET /ws`)
- Parse OTLP ExportTraceServiceRequest JSON → extract spans → emit `FlowEvent`
- Parse OTLP ExportLogServiceRequest JSON → filter for `mail_e2e_event` → emit `FlowEvent`
- CORS middleware (allow localhost:5173)
- Health endpoint

### Step 3: Core type system + hooks
- `core/types.ts` — all TypeScript types
- `useRelayConnection` — WebSocket client with reconnect
- `useFlowAnimations` — span→node mapping + status management
- `useLogStream` — full session log history per node + global
- `useTraceTimeline` — span durations + parent-child waterfall

### Step 4: Generic shape node components
- Build all 9 shape primitives: RectangleNode, RoundedRectNode, DiamondNode, CircleNode, PillNode, BadgeNode, OctagonNode, GroupNode, AnnotationNode
- Each shape renders: label, sublabel, bullets, icon based on `style` props
- Build CSS animations: glow (box-shadow), pulse (keyframe), flash (success/error), color tinting from `style.color`
- Build shared NodeStatusBadge component (idle/active/success/error dot)
- Build DurationBadge component (color-coded duration display)
- Build edge components (AnimatedEdge with particle, DashedEdge)

### Step 5: Canvas + UI shell
- `FlowCanvas` — React Flow wrapper with minimap, controls
- `LogPanel` — global live tail sidebar
- `NodeDetailPanel` — per-node logs + traces + attributes tabs
- `FlowSelector` — top bar with dropdown, connection status, clear session, event counter
- `App.tsx` — compose everything

### Step 6: Mail pipeline flow config
- `flows/mail-pipeline.ts` — all nodes, edges, positions, spanMapping
- Iterate on positions until the layout matches the Excalidraw diagram

### Step 7: Testing & mock replay

Build tests that verify the full pipeline works **without any external dependencies** (no resq-agent, no OTEL collector, no running services). If these all pass, live flow will work too — it's the same data through the same pipes, just real instead of mock.

#### 7a. Mock event replay fixture + script

**File: `ui/src/test/fixtures/mail-pipeline-replay.json`**
- A JSON array of `FlowEvent` objects simulating a complete mail pipeline run, in chronological order
- Should cover the full happy path: enqueue batchfill → worker pickup → success → cron tick → enqueue incoming → worker pickup → write threads to S3 → write metadata to Postgres → enqueue analyze → enqueue extract → analyze worker pickup → decision: draft_reply → insert draft → autosend: yes → enqueue send → send worker pickup → sent success
- Also include an error case: one extract worker run that fails, shows error state, then retries and succeeds
- Each event has realistic timestamps (spaced 100-500ms apart), trace IDs, span IDs, parent span IDs, durations
- This fixture is the **source of truth** for what a working flow looks like

**File: `ui/src/test/replay.ts`** (runnable via `bun run replay`)
- Reads `mail-pipeline-replay.json`
- Connects to `ws://localhost:4200/ws` (or directly injects into the UI if relay isn't running)
- Sends each FlowEvent with the timing delays from the fixture
- Useful for: demo mode, visual testing, development iteration without running resq-agent
- Add a `--speed` flag: `bun run replay --speed 2x` to speed up/slow down

**File: `ui/src/test/replay-direct.ts`** (runnable via `bun run replay:direct`)
- Same as above but bypasses the relay entirely — imports the hooks directly and feeds mock events
- For when you just want to see the UI animate without starting the relay server

#### 7b. Relay integration tests (Rust — `cargo test`)

**File: `relay/tests/otlp_to_ws.rs`**
- Start the relay server on a random port
- POST a valid OTLP ExportTraceServiceRequest JSON payload to `/v1/traces`
- Connect a WebSocket client to `/ws`
- Assert the client receives a correctly shaped `FlowEvent` with the right span_name, trace_id, span_id, attributes, duration_ms
- Test both `span_start` and `span_end` event types

**File: `relay/tests/otlp_logs.rs`**
- POST a valid OTLP ExportLogServiceRequest JSON payload to `/v1/logs` containing a `mail_e2e_event` structured log
- Assert WebSocket client receives a `FlowEvent` with type `"log"`, correct action, function_name, queue_name, status
- Also test that non-`mail_e2e_event` logs are filtered out (not broadcast)

**File: `relay/tests/ws_broadcast.rs`**
- Connect multiple WebSocket clients
- POST one OTLP payload
- Assert all clients receive the event
- Disconnect one client, POST again, assert remaining clients still receive events (no crash)

#### 7c. Frontend hook unit tests (Vitest — `bun test`)

**File: `ui/src/core/hooks/__tests__/useFlowAnimations.test.ts`**
- Feed a sequence of mock FlowEvents into the hook (using the mail pipeline spanMapping)
- Assert: `span_start` for `handle_mail_extract` → `extract-worker` node status becomes `'active'`
- Assert: `span_end` with success → node status becomes `'success'`, then auto-clears to `'idle'` after timeout
- Assert: `span_end` with error → node status becomes `'error'`, stays until next event
- Assert: `log` with action=enqueue → queue node counter increments
- Assert: `log` with action=worker_pickup → queue counter decrements, worker node activates
- Assert: duration_ms is stored on node status after span_end

**File: `ui/src/core/hooks/__tests__/useLogStream.test.ts`**
- Feed mock events, assert per-node log maps populate correctly
- Assert global log list is ordered by timestamp
- Assert `clearSession()` resets everything
- Assert events with unknown span mappings go to global but not to any node

**File: `ui/src/core/hooks/__tests__/useTraceTimeline.test.ts`**
- Feed span_start then span_end events with matching span_ids
- Assert SpanEntry is created with correct duration
- Feed parent + child spans, assert tree structure is correct
- Assert spans group by trace_id

**File: `ui/src/core/hooks/__tests__/spanMapping.test.ts`**
- Test the span mapping resolution logic directly (the priority chain: span_name → function_name → queue_name → worker_name → action)
- Feed a FlowEvent with `function_name: "handle_mail_extract"` → assert it resolves to `extract-worker`
- Feed a FlowEvent with `queue_name: "rrq:queue:mail-analyze"` → assert it resolves to `analyze-queue`
- Feed a FlowEvent with `action: "threads_written"` → assert it resolves to `write-threads`
- Feed a FlowEvent with no matching attributes → assert it returns null (unmapped)

#### 7d. Component render tests (Vitest + React Testing Library)

**File: `ui/src/core/nodes/__tests__/nodes.test.tsx`**
- Render each of the 9 shape nodes with mock FlowNodeConfig props
- Assert: label text renders, sublabel renders when provided, bullets render when provided
- Assert: status badge changes color class based on status prop (idle/active/success/error)
- Assert: DurationBadge renders when duration_ms is provided

#### 7e. Makefile test targets

```makefile
test:                         ## Run all tests
	@make -j2 test-relay test-ui

test-relay:                   ## Run Rust relay tests
	cd relay && cargo test

test-ui:                      ## Run frontend tests
	cd ui && bun test

replay:                       ## Run mock event replay (start relay + ui first)
	cd ui && bun run replay

replay-direct:                ## Run mock replay without relay (start ui first)
	cd ui && bun run replay:direct
```

### Step 8: End-to-end live integration (manual, after tests pass)
- Start relay, start UI, point resq-agent OTEL at relay
- Run an e2e mail test
- Verify nodes light up, edges animate, logs appear in panels, traces show waterfalls
- This should "just work" if Steps 7a-7d all pass — same data flow, real events instead of mock

---

## Verification & Testing

**The testing strategy is designed so that if all automated tests pass, live integration will work.** The layers:

1. **Relay tests** (`cargo test`) — verify OTLP JSON → FlowEvent → WebSocket broadcast works correctly
2. **Hook tests** (`bun test`) — verify FlowEvent → node status changes, log accumulation, trace timeline construction, span mapping resolution
3. **Component tests** (`bun test`) — verify nodes render correctly with props and status changes
4. **Mock replay** (`bun run replay`) — visual end-to-end: full mail pipeline sequence plays through the UI with realistic timing, nodes glow, edges animate, logs stream, durations show. This is both a test and a demo mode.
5. **Live integration** (manual) — real OTEL data from resq-agent. If 1-4 pass, this is just swapping mock data for real data through the same pipeline.

**Visual iteration:** The x/y positions in mail-pipeline.ts will need manual tuning. React Flow supports drag-to-reposition in dev mode — add a "save positions" button that dumps current positions to console for copy-paste back into the config.

---

## Future Extensibility

Adding a new flow (e.g., Nora chat) uses the **same generic shapes** with different styling:

```typescript
// flows/nora-chat.ts
export const noraChat: FlowConfig = {
  id: 'nora-chat',
  name: 'Nora Chat Pipeline',
  nodes: [
    { id: 'user-msg',   type: 'pill',        label: 'User Message',    style: { color: 'green' },                  position: { x: 0, y: 0 } },
    { id: 'nora-agent',  type: 'rectangle',   label: 'Nora Agent',      style: { color: 'purple', icon: 'bot' },    position: { x: 200, y: 0 } },
    { id: 'skill-select', type: 'diamond',     label: 'Which skill?',    style: { color: 'orange' },                 position: { x: 400, y: 0 } },
    { id: 'tts',          type: 'roundedRect', label: 'TTS Generation',  style: { color: 'green' },                  position: { x: 600, y: 0 } },
    { id: 'twilio',       type: 'circle',      label: 'Twilio',          style: { color: 'red', icon: 'external' },  position: { x: 800, y: 0 } },
    // ...
  ],
  edges: [...],
  spanMapping: {
    'nora.process_message': 'nora-agent',
    'nora.skill_select': 'skill-select',
    'nora.tts': 'tts',
    'twilio.end_call': 'twilio',
  }
};
```

Zero new components needed. Same 9 shapes, different colors/icons/labels. Register in `flows/index.ts`, pick from dropdown. Done.

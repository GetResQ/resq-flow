# resq-flow Future State

> The north star for resq-flow as a real observability product.
> Every foundation and redesign decision must map back to this document.

---

## What's Next

Foundation and redesign plans are **complete** (all 7 tasks + 13 phases). Below is what remains, ordered by priority.

### Now (when ready)

| Item | What | Blocked By |
|------|------|------------|
| **Relay aggregation endpoint** | Expose run counts, success rates, p95 latency, time-series data from Victoria via relay API | Relay work (Rust) |
| **Wire mock → real queries** | Replace mock data in `ui/src/core/mockMetrics.ts` with `useQuery` calls in `FlowsHome.tsx` and `MetricsView.tsx` | Relay endpoint above |
| **Waterfall URL deep linking** | Wire TraceDetailPanel's waterfall tab to `?view=waterfall` URL param via `useUrlState` | Nothing — trivial |

### Next (schedule when using the tool day-to-day)

| Item | What | Complexity |
|------|------|------------|
| **Error Intelligence** | Group similar errors by message pattern, show frequency + trend sparkline, surrounding log context | Medium |
| **Run Comparison** | Side-by-side waterfall of failed run vs last successful run, highlight which node diverged | Medium |
| **Flow Contract v2** | Add `health` and `metrics` sections to JSON contract (thresholds, time windows, display prefs) | Low |
| **Advanced Latency** | p50/p95/p99 breakdowns per node across runs, latency distribution histograms | Medium |
| **Annotations & Bookmarks** | Mark interesting runs, add notes, share with teammates | Low |

---

## Core Product Identity

resq-flow is a **flow-oriented observability product** — not a graph toy, not a log viewer, not a metrics dashboard. It is all three, unified under one navigation model:

```
Flows Home → Flow (Canvas | Metrics | Logs) → Run → Node → Logs/Spans
```

The graph is one view, not the whole product. Metrics mode, headless mode, and log-first mode are equal citizens.

### Flow Semantics Principles

When `resq-flow` renders a flow graph, it should bias toward operationally
truthful execution boundaries and rich subordinate detail.

This means:

- real queue and worker boundaries should remain first-class by default
- meaningful decision/process nodes should also remain first-class when they
  are independently useful to inspect
- important writes, queue handoffs, validations, and status transitions should
  usually stay visible as detail rather than being promoted into extra nodes
- exception paths are often better shown as small side branches or notes than
  forced through the happy path
- architecture sketches (for example Excalidraw) may be fuller than the
  production graph; the graph should stay honest about execution ownership even
  when the sketch shows more context

For future flow work, the preferred sequence is:

1. validate the real runtime/code path
2. classify each item as first-class node, visible detail, or hidden detail
3. update the flow spec
4. implement producer and graph changes against that declared shape

---

## Navigation & Information Architecture

### Level 0: Flows Home (Multi-Flow Overview)

The app's landing page. Answers: **"Are my systems healthy right now?"**

```
┌─────────────────────────────────────────────────────┐
│  Flows                                    [Cmd+K]   │
│                                                      │
│  ┌─ Mail Pipeline ──────────────── ● Healthy ──────┐│
│  │  1,247 runs/24h  │  99.2% success  │  p95: 342ms ││
│  │  ▁▂▃▅▃▂▁▂▃▅▇▅▃▂▁ throughput       ▁▁▁▃▁▁▁ errs  ││
│  └──────────────────────────────────────────────────┘│
│  ┌─ SMS Pipeline ──────────────── ▲ Degraded ──────┐│
│  │    892 runs/24h  │  94.1% success  │  p95: 1.2s   ││
│  │  ▁▂▃▂▁▂▃▂▁▂▃▂▁▂▁ throughput       ▁▁▃▅▃▁▁ errs  ││
│  └──────────────────────────────────────────────────┘│
│  ┌─ Webhook Ingest ───────────── ● Healthy ────────┐│
│  │  3,402 runs/24h  │  99.8% success  │  p95: 89ms   ││
│  │  ▃▅▇▅▃▅▇▅▃▅▇▅▃▅▃ throughput       ▁▁▁▁▁▁▁ errs  ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

Each flow card shows:
- Flow name + health status badge (Healthy / Degraded / Down / Unknown)
- Run count (time window), success rate, p95 latency
- Sparkline: throughput trend + error trend
- Click → enters that flow

### Level 1: Flow View (Three Modes)

Once inside a flow, the user picks their lens:

| Mode | Primary Content | When to Use |
|------|----------------|-------------|
| **Canvas** | React Flow graph + right detail drawer | Understanding flow topology, watching live execution |
| **Metrics** | Stat cards + sparklines + recent runs table | Quick health check, "is it getting worse?" |
| **Logs** | Full-width log stream with filters | Debugging a specific error or pattern |

Mode switching via tabs or keyboard (1/2/3). All three modes share the same header, breadcrumb, and command palette.

#### Metrics Mode (No Graph Required)

```
┌──────────────────────────────────────────────────┐
│  Mail Pipeline  ›  Metrics            [1] [2] [3]│
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │ 1,247    │ │ 99.2%    │ │ 342ms    │ │ 3    ││
│  │ Runs/24h │ │ Success  │ │ p95 Lat  │ │ Errors││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                    │
│  Throughput ▁▂▃▅▃▂▁▂▃▅▇▅▃▂▁▂▃▅▃▂▁▂▃   (24h)    │
│  Errors     ▁▁▁▁▁▁▁▁▁▃▁▁▁▁▁▁▁▁▁▁▁▁▁   (24h)    │
│  Latency    ▂▂▃▂▂▂▃▅▃▂▂▂▂▂▃▂▂▂▂▂▂▂▂   p95 (24h)│
│                                                    │
│  Recent Runs                                       │
│  ┌────────┬──────────┬────────┬────────┬─────────┐│
│  │ Run    │ Status   │ Nodes  │ Dur    │ Updated ││
│  ├────────┼──────────┼────────┼────────┼─────────┤│
│  │ #1247  │ ✓ Done   │ 12/12  │ 1.2s   │ 2m ago  ││
│  │ #1246  │ ✗ Failed │ 8/12   │ 0.8s   │ 5m ago  ││
│  │ #1245  │ ✓ Done   │ 12/12  │ 1.1s   │ 8m ago  ││
│  └────────┴──────────┴────────┴────────┴─────────┘│
└──────────────────────────────────────────────────┘
```

This mode works for ANY flow — graph-backed or headless. It pulls aggregated data from Victoria (history path) and live counters from the relay (live path).

### Level 2: Run Detail

Drill into a single run. Two sub-views:

#### Run Summary
- Stat cards: total duration, node count, error count, status
- Node execution waterfall (span timeline)
- Error summary (if any)

#### Trace Waterfall

```
┌─────────────────────────────────────────────────┐
│  Run #1247  ›  Waterfall                         │
│                                                   │
│  parse-headers  ████░░░░░░░░░░░░░░░░░  42ms     │
│  analyze        ░░░░████████░░░░░░░░░  120ms    │
│  extract-body   ░░░░░░░░░░░░████░░░░░  65ms     │
│  send-reply     ░░░░░░░░░░░░░░░░████░  80ms     │
│  ──────────────────────────────────────────      │
│  Total: 307ms            Critical path: 287ms    │
└─────────────────────────────────────────────────┘
```

- Horizontal bars showing span execution over time
- Critical path highlighting (which nodes are on the longest path)
- Click any bar → opens Node detail drawer

### Level 3: Node Detail (Drawer)

Push drawer from right side. Tabs:
- **Overview**: status, duration, input/output summary, recent log tail
- **Timing**: span-level breakdown, p50/p95/p99 for this node across recent runs
- **Logs**: filtered log stream for this node only
- **Advanced**: raw telemetry attributes, trace IDs, span IDs

### Level 4: Log Detail (Inline Expand)

Click a log row → inline expansion showing full message, structured fields, trace context. No new page or panel.

---

## Data Visualization Primitives

### Sparkline
- Tiny inline SVG chart (~60px tall, variable width)
- Used in: Flows Home cards, Metrics Mode stat cards, RunsTable inline columns
- Shows 24h of data by default, configurable time window
- Variants: line (throughput), bar (discrete events), area (latency band)

### Stat Card
- Large value (`text-2xl font-semibold`) + small label (`text-xs text-muted`)
- Optional sparkline below the value
- Optional trend indicator (↑ 12% or ↓ 5% vs previous period)
- Status-colored left border or background tint

### Status Badge
- Dot + label compound component
- States: healthy/success (green), degraded/warning (amber), down/error (red), unknown/idle (gray), active/running (blue pulse)
- Never color-only — always dot + text

### Waterfall Chart
- Horizontal span bars with time axis
- Color-coded by status (success/error/running)
- Nested spans indented
- Hover shows exact timing
- Click navigates to node detail

### Health Indicator
- Flow-level aggregate status
- Computed from: success rate threshold, latency threshold, error count threshold
- Configurable per flow in the JSON contract

---

## Live vs. History: Two Intentional Paths

### Live Mode
- WebSocket streaming from relay
- Append-only, bounded buffer
- Canvas nodes animate in real-time (pulse, glow, edge particles)
- Metrics mode shows live counters updating
- Log stream auto-tails with pause-on-scroll
- Pulsing green dot in header indicates live connection
- No time-range selector — always "now"

### History Mode
- On-demand queries to Victoria via relay
- Time-range selector (last 1h, 6h, 24h, 7d, custom)
- Playback controls (pause, speed, step forward)
- Canvas replays execution sequence
- Metrics mode shows aggregate stats for the time window
- Waterfall available for any completed run
- No live indicators — replaced by time-range display

---

## Keyboard & Power User Experience

### Command Palette (Cmd+K)
- Search flows by name
- Jump to specific run by ID
- Filter nodes by status
- Switch between Canvas/Metrics/Logs modes
- Toggle focus mode
- Access settings

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Cmd+K` | Command palette |
| `1` / `2` / `3` | Switch to Canvas / Metrics / Logs mode |
| `F` | Toggle focus mode (collapse header, maximize content) |
| `Escape` | Close drawer / go up one level |
| `J` / `K` | Navigate between items (runs, logs, nodes) |
| `Enter` | Open selected item detail |
| `?` | Show keyboard shortcut overlay |
| `T` | Toggle theme (dark/light) |
| `L` | Toggle live/history mode |

### Deep Linking
Every view state encoded in URL:
```
/                                          → Flows Home
/flows/mail-pipeline                       → Flow default view (Canvas)
/flows/mail-pipeline?view=metrics          → Flow Metrics mode
/flows/mail-pipeline?view=logs             → Flow Logs mode
/flows/mail-pipeline/runs/1247             → Run detail
/flows/mail-pipeline/runs/1247?node=parse  → Run with node drawer open
/flows/mail-pipeline/runs/1247?view=waterfall → Run waterfall
```

Shareable. Bookmarkable. Browser back/forward works.

---

## Error Intelligence

### Error Grouping
- Cluster similar errors by message pattern (strip dynamic values)
- Show frequency: "Failed to connect to SMTP — 12 occurrences in last 24h"
- Group-level trend sparkline
- Click group → see individual occurrences

### Error Context
- Which node failed
- Which run it belongs to
- Surrounding log lines (3 before, 3 after)
- Link to trace waterfall at the failure point

### Run Comparison
- Compare a failed run against the last successful run
- Side-by-side waterfall showing timing differences
- Highlight which node diverged
- "This run took 3.2x longer at the `send` node"

---

## Flow Contract Extensions

Current JSON contract handles telemetry matching and context retention. Future extensions:

```json
{
  "version": 2,
  "id": "mail-pipeline",
  "name": "Mail Pipeline",
  "telemetry": { "..." },
  "keep_context": { "..." },

  "health": {
    "success_rate_threshold": 0.95,
    "p95_latency_warn_ms": 500,
    "p95_latency_crit_ms": 2000,
    "error_count_warn_24h": 5,
    "error_count_crit_24h": 20
  },

  "metrics": {
    "time_windows": ["1h", "6h", "24h"],
    "default_window": "24h"
  },

  "display": {
    "default_view": "canvas",
    "show_sparklines": true
  }
}
```

Health thresholds and display preferences live in the contract, not hardcoded in the UI.

---

## Component Architecture (Target State)

```
Layer 0: Design Tokens
         CSS custom properties (three-tier: primitive → semantic → component)
         Tailwind theme mapping (bg-surface, text-muted, border-accent)
         Motion tokens (spring constants, durations)

Layer 1: Primitives (shadcn/ui + Radix)
         Button, Badge, Tabs, Input, Select, Dropdown, Tooltip,
         ScrollArea, Separator, Card, Sheet, Command, Table, Toggle

Layer 2: Data Visualization
         Sparkline, StatCard, StatusBadge, WaterfallChart,
         HealthIndicator, DurationBadge, TrendIndicator

Layer 3: Compound Components
         NodeCard, RunRow, LogEntry, FlowCard, ErrorGroup,
         DetailPanel (with tab composition)

Layer 4: Layout Primitives
         AppShell (sidebar + topbar + content)
         SplitView (resizable panels via react-resizable-panels)
         Stack / Cluster (flex with gap tokens)
         ScrollArea (styled scrollable container)
         EmptyState (consistent placeholder)

Layer 5: View Compositions
         CanvasView (React Flow + detail drawer)
         MetricsView (stat cards + sparklines + runs table)
         LogsView (full-width filtered log stream)
         WaterfallView (span timeline for a run)
         FlowsHome (multi-flow overview)

Layer 6: App Shell
         Sidebar navigation (collapsible)
         Breadcrumb bar (Flow > Run > Node)
         Command palette (global overlay)
         Focus mode (collapsed header, maximized content)
```

---

## State Architecture (Target State)

### URL State (navigational — shareable)
- Current flow ID
- Current view mode (canvas/metrics/logs)
- Current run ID
- Selected node ID
- Time range (history mode)
- Panel open/closed

### UI Layout Store (Zustand — local only)
- Sidebar collapsed/expanded
- Panel sizes (resizable panel percentages)
- Focus mode on/off
- Command palette open/closed
- Theme preference
- Last-used view mode per flow

### Data State (React hooks — session-scoped)
- Live event stream (useRelayConnection)
- Flow animations (useFlowAnimations)
- Log aggregation (useLogStream)
- Trace journeys (useTraceJourney)
- Trace timelines (useTraceTimeline)
- Playback controls (useEventPlayback)

### Server State (TanStack Query — cache + revalidate)
- Victoria history queries
- Aggregated metrics (run counts, success rates, latencies)
- Error groups
- Flow health status

---

## What "Done" Looks Like

A developer opens resq-flow and:

1. **Sees all flows at a glance** — health status, throughput, error rate. No clicking needed.
2. **Clicks into a flow** — lands on their preferred view (canvas or metrics). Switches freely.
3. **In metrics mode** — sees stat cards with sparklines, recent runs table. Knows instantly if things are healthy or degrading.
4. **In canvas mode** — sees the live graph with nodes pulsing, edges animating. Clicks a node, drawer pushes in with detail.
5. **Drills into a run** — sees the waterfall showing exactly where time was spent. Sees errors highlighted.
6. **Compares a failed run** — side-by-side with last success, sees exactly which node diverged.
7. **Uses Cmd+K** — jumps to any flow, run, or node instantly.
8. **Shares a URL** — teammate opens it and sees exactly the same view.
9. **Toggles live/history** — live feels immediate, history feels like a time machine.
10. **Walks away** — the Flows Home page tells them tomorrow if something broke overnight.

---

## Traceability: Future State ← Plan Phases

Every future-state capability maps to a specific plan phase. If it doesn't have a phase, it's not scheduled yet.

| Future-State Capability | Foundation Plan | Redesign Phase | Status |
|------------------------|-----------------|----------------|--------|
| Design tokens (3-tier) | Task 5, 5.5 | -- | ✅ Done |
| shadcn primitives (14 components) | Task 4 | Phase 2 (swap in) | ✅ Done |
| URL routing / deep linking | Task 2 (dep install) | Phase 0 | ✅ Done |
| Zustand UI layout store | Task 2 (dep install) | Phase 0 | ✅ Done |
| TanStack Query (server state) | Task 2 (dep install) | Phase 2.5, 6 | ✅ Done (mock data, TODO for real queries) |
| Typography & spacing reset | -- | Phase 1 | ✅ Done |
| Flows Home (multi-flow overview) | -- | Phase 2.5 | ✅ Done |
| Sparkline primitive | -- | Phase 2.5 | ✅ Done |
| Panel system (Sheets, focus mode) | -- | Phase 3 | ✅ Done |
| TanStack data tables | Task 2 (dep install) | Phase 4 | ✅ Done |
| Command palette (Cmd+K) | Task 2 (cmdk dep) | Phase 5 | ✅ Done |
| Metrics Mode (any flow) | -- | Phase 6 | ✅ Done |
| View mode switching (Canvas/Metrics/Logs) | -- | Phase 6 | ✅ Done |
| Canvas polish (semantic zoom, animations) | -- | Phase 7 | ✅ Done |
| Trace waterfall | -- | Phase 7.5 | ✅ Done |
| Card-based panel content | -- | Phase 8 | ✅ Done |
| Loading/empty states, transitions | -- | Phase 9 | ✅ Done |
| Victoria aggregation API wiring | -- | Phases 2.5, 6 | ❌ Blocked — relay endpoint needed |
| Waterfall URL deep linking (`?view=waterfall`) | -- | Phase 7.5 | ❌ Not implemented — internal tab state only |
| Error grouping & frequency | -- | Not yet scheduled | ❌ Future |
| Run comparison (failed vs success) | -- | Not yet scheduled | ❌ Future |
| Flow contract health thresholds (v2) | -- | Not yet scheduled | ❌ Future |
| Latency percentile displays (p50/p95/p99) | -- | Not yet scheduled | ❌ Future |
| Annotations & Bookmarks | -- | Not yet scheduled | ❌ Future |

### Remaining Work (Before Future Phases)

These items were deferred during the current implementation and should be addressed before the future phases:

1. **Victoria aggregation API** — Phases 2.5 (FlowsHome) and 6 (MetricsView) use mock data in `ui/src/core/mockMetrics.ts`. When the relay exposes aggregation endpoints, swap mock data for `useQuery` calls. Marked with `// TODO: wire to useQuery when relay endpoint exists`.
2. **Waterfall URL deep linking** — The waterfall tab in TraceDetailPanel uses internal tab state, not `?view=waterfall` URL param. Low priority — the tab is accessible via click.

### Not Yet Scheduled (Future Phases)

These capabilities are documented in this file but do not have a redesign phase yet. They should be scheduled now that the Phase 9 baseline is stable:

1. **Error Intelligence** — Error grouping by pattern, frequency tracking, surrounding log context
2. **Run Comparison** — Side-by-side waterfall of failed vs last-success, node-level divergence highlighting
3. **Flow Contract v2** — Health thresholds, metrics config, display preferences in JSON contract
4. **Advanced Latency** — p50/p95/p99 breakdowns per node across runs, latency distribution histograms
5. **Annotations & Bookmarks** — Mark interesting runs, add notes, share with teammates

---

## Dependency Map

```
future-state.md (this doc — north star)
  ↑ every phase must serve this
PLAN-claude-ui-redesign.md (13 phases — ✅ ALL COMPLETE)
  ↑ depends on
PLAN-codex-ui-foundation.md (7 tasks — ✅ ALL COMPLETE)
  ↑ depends on
Current main branch
```

Every foundation and redesign decision should be validated against this document.
If a change doesn't serve the future state, question whether it belongs.
If the future state requires something the foundation doesn't support, fix the foundation first.

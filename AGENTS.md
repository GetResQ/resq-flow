# resq-flow agent guide

Use this file as the first-stop operating guide for agents working in this repo.

## What this repo is

`resq-flow` is a local flow visualizer and log viewer for ResQ telemetry.

It has three main surfaces:

- `relay/`
  Rust relay that ingests OTLP traces/logs and serves WebSocket + history APIs
- `ui/`
  React app that renders flows, runs, logs, and drill-down views
- `cli/`
  Headless interface for status checks, log inspection, `runs explain`, and manual debug emits

## Read order

Open these in roughly this order:

1. `README.md`
2. `ARCHITECTURE.md`
3. `docs/flow-event-contract.md`
4. `docs/cli.md`
5. `skills/README.md`

## Core product model

- `component_id` is the first-class node identity
- `step_id` is attached detail under that node
- raw `component_id` and `step_id` use kebab-case
- raw `step_id` stays child-only and must not include the node prefix
- when you refer to one exact node step in prose, tests, or issue notes, use `component_id.step_id`
- node logs define the sparse flow structure
- step logs provide richer drill-down without turning every detail into a graph node
- keep the graph sparse and the drill-down rich

Do not model every architecture box as a first-class node.

## Skills

Use the local skills as the front door for agent work:

- `flow-cli-create`
  create a brand-new flow
- `flow-cli-write`
  add or change logs for an existing flow
- `flow-cli-read`
  inspect logs, tail live activity, or explain why a run stopped, failed, or completed

If you are adding a new flow, start with `skills/flow-cli-create/SKILL.md`.

## Repo map

- `docs/`
  durable local docs for the shared flow contract and CLI usage
- `skills/`
  agent workflows for create, write, and read
- `ui/src/flow-contracts/`
  shared JSON flow contracts
- `ui/src/flows/`
  optional TypeScript graph and view configs
- `examples/vector/`
  example Vector fanout snippet
- `ui/DESIGN-SYSTEM.md`
  UI and language rules

## Validation commands

Use the `Makefile` first:

- `make dev`
- `make test`
- `make build-cli`
- `make test-cli`
- `make replay`

Useful focused checks:

- `cd relay && cargo test`
- `cd ui && bun test`
- `cd ui && bun run build`
- `cd cli && bun test`
- `cd cli && bun run build`

## Guardrails

- Do not invent a second telemetry pipeline.
- Keep flow scope explicit.
- Do not silently treat global logs as flow logs.
- Keep CLI behavior deterministic; do not add LLM requirements for basic explain or inspection.
- Prefer repo-local docs over assumptions about private external docs.
- Do not invent graph nodes that are not backed by real runtime boundaries.

## UI rules worth keeping in mind

- Use shadcn components from `@/components/ui/` for standard UI primitives.
- Read `ui/DESIGN-SYSTEM.md` before touching the frontend — it has palette, spacing, sizing, and language rules.

### Canvas node system

The node system uses **closed visual primitives** (4 shapes + 7 colors) with **open content** (eyebrow text and titles are free strings). There are no semantic roles — the system does not know what a "queue" or "worker" is.

**Adding nodes to a flow:** use the preset functions in `ui/src/flows/nodeFactory.ts`:

```ts
queueNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
workerNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
stepNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
detailNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
decisionNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
resourceNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
triggerNode({ id: '...', label: '...', position: { x: 0, y: 0 } })
```

For custom nodes that don't fit a preset, compose directly: `{ type: 'roundedRect', style: { color: 'sky' }, eyebrow: 'HANDLER', label: '...' }`.

**Do not:**
- Use `semanticRole` — it no longer exists
- Use `type: 'pill'` — it no longer exists
- Hardcode dimensions on node components — sizes come from `ui/src/core/nodeSizing.ts`
- Add new entries to `firstClassColors` without updating CSS tokens in `index.css` and `theme.ts`

**Sizing (do not override):** standard rect `184 × 64`, detail rect `184 × 44`, diamond `92 × 92`, cylinder `88 × 104`.

**Titles:** aim for ≤22 characters (1 line). Up to ~44 wraps to 2 lines. Beyond that truncates with a tooltip. If a title truncates, shorten it.

### General UI language

- Prefer `Flow`, `Run`, `Node`, `Logs`, `Status`, and `Timing` in the main UI.
- Reserve lower-level telemetry words like `trace`, `span`, and `event` for advanced views.

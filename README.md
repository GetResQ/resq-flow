# resq-flow

`resq-flow` is a local development-only flow visualization tool for ResQ Agent telemetry.

## What it does

- Receives OTLP traces/logs via a Rust relay (`relay/`)
- Broadcasts normalized `FlowEvent` JSON over WebSocket
- Renders flow diagrams in React Flow (`ui/`) with live node status, edge activity, logs, and trace timelines
- Supports fixture-based replay for offline development

## Project layout

- `relay/`: Axum OTLP receiver + WebSocket broadcast relay
- `ui/`: Vite + React + TypeScript visualization app
- `ui/src/flows/mail-pipeline.ts`: mail pipeline flow config
- `ui/src/test/fixtures/mail-pipeline-replay.json`: mock replay event sequence

## Development

```bash
make dev
```

- Relay: `http://localhost:4200`
- UI: `http://localhost:5173`

## Testing

```bash
make test
```

Or run each suite individually:

```bash
cd relay && cargo test
cd ui && bun test
```

## Replay

Relay-backed replay:

```bash
make replay
```

Direct replay mode (no relay required):

```bash
make replay-direct
```

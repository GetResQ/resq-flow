# Implementation Planning Request

## Status Snapshot
- ✅ Done in this repo: relay extraction into `ingest` / `ws` / `history` / `health`, shared JSON flow contracts, contract-aware live filtering, WS `snapshot` / `batch` envelopes, ingest health/capabilities, UI live/history split, headless-flow rendering, and the current mail flow panels.
- ✅ Verified on March 10, 2026: `cd relay && cargo test`, `cd ui && bun test`, and `cd ui && bun run build` all pass. The UI build still warns about a large output chunk.
- ❌ Not done: branch cleanup / bogus residue removal / intentional commit slicing. `git status --short` is still dirty.
- ❌ Not done: full end-to-end proof of Vector fanout through the applied `fullstack` config, Victoria/Grafana resilience when `resq-flow` is down, history/detail hardening, and the final human verification pass.

## Task Summary
- Clean up the current dirty branch, delete bogus residue, and turn the useful work into coherent baseline commits.
- Re-shape the code early where needed so `resq-flow` has a clean live path, a clean history path, and clear module boundaries.
- Evolve `resq-flow` into a low-latency live visualizer fed by Vector fanout, while keeping Victoria as the storage/query source of truth.

## Scope (Required)
- Must-do outcomes:
  - Build around `Vector -> Victoria + resq-flow` fanout as the primary local architecture.
  - Make live mode feel immediate and smooth, while keeping richer history/detail views anchored in Victoria.
  - Treat current branch cleanup, commit slicing, and any file/layout re-architecture as the first implementation work.
- Must-not-do constraints:
  - Do not make `resq-flow` the new source of truth or a second observability database.
  - Do not disrupt the existing Victoria/Grafana path just to support `resq-flow`.
  - Do not block v1 on `fullstack` app emission; `resq-agent` is the confirmed producer today.
- Acceptance checks (done criteria):
  - ❌ Current branch is cleaned up, bogus files are removed, and remaining work is grouped into intentional commits.
  - ❌ Live telemetry reaches `resq-flow` through Vector fanout with no playback-style lag in live mode.
  - ❌ Victoria/Grafana continue to work when `resq-flow` is down or disconnected.
  - ❌ UI supports smooth live flow visualization plus on-demand history/detail views without trying to hold the full firehose in browser state.

## Existing Patterns To Follow
- Docs already point toward collector-compatible fanout in [README.md](/Users/jeremyrojas/worktrees/resq-flow/README.md), [resq-flow.md](/Users/jeremyrojas/worktrees/resq-flow/resq-flow.md), and [ARCHITECTURE.md](/Users/jeremyrojas/worktrees/resq-flow/ARCHITECTURE.md).
- Relay already owns OTLP ingest, health/capabilities, WS broadcast, and Victoria-backed history in [relay/src/lib.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/src/lib.rs).
- UI already follows a good “generic core + flow config” pattern in [ui/src/core/types.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/types.ts), [ui/src/core/hooks/useFlowAnimations.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/hooks/useFlowAnimations.ts), and [ui/src/flows/mail-pipeline.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/flows/mail-pipeline.ts).
- Replay/testing patterns already exist and should be preserved in [Makefile](/Users/jeremyrojas/worktrees/resq-flow/Makefile) and [ui/src/test/fixtures/mail-pipeline-replay.json](/Users/jeremyrojas/worktrees/resq-flow/ui/src/test/fixtures/mail-pipeline-replay.json).
- For Rust and repo hygiene, borrow relevant conventions from `resq-agent` where they fit a greenfield repo:
  - [RUST_BEST_PRACTICES.md](/Users/jeremyrojas/worktrees/resq-agent/telemetry-improvements/crates/resq-agent/docs/RUST_BEST_PRACTICES.md)
  - [AGENTS.md](/Users/jeremyrojas/worktrees/resq-agent/telemetry-improvements/AGENTS.md)
- Concretely, that means:
  - prefer `Result<T, Error>` style route/handler boundaries where relevant
  - avoid `unwrap`/`expect` on external data
  - prefer bounded channels, explicit timeouts, and clear task shutdown paths
  - run `cargo fmt` and `cargo clippy -- -D warnings`
  - follow existing local patterns first before inventing new ones
- Do not cargo-cult repo-specific `resq-agent` rules that are unrelated to `resq-flow`'s architecture, tooling, or runtime model.

## New Patterns Introduced (If Any)
- Separate live transport from replay/history playback.
  Why: live mode should render immediately; replay/history can stay time-shaped.
- Split relay responsibilities into smaller modules such as `ingest`, `ws`, `history`, and `health`.
  Why: current [relay/src/lib.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/src/lib.rs) is carrying too many concerns.
- Use a batched WS/event envelope for the live path.
  Why: smoother browser updates and clearer backpressure behavior than one-message-per-event.
- Make flow matching and filtering policy configurable.
  Why: developers should be able to add new flows without editing relay filter logic by hand every time.
- Introduce a shared flow contract format that can be consumed by the Rust relay and lightweight non-graph UI surfaces.
  Why: the relay needs a small, shared source of truth for flow membership, filtering, and tagging.
- Keep rich flow view configs in TypeScript.
  Why: large diagram/view definitions benefit from TypeScript typing, editor support, shared constants, and computed values.
- Chosen format: two layers per flow.
  Why: this keeps the relay contract small and shared, while preserving strong DX for UI view authoring.
- Layer 1: versioned JSON flow contract.
  Why: JSON is easy for the Rust relay to parse with existing `serde_json`, and small enough to stay readable and shared across runtimes.
- Layer 2: optional TypeScript flow view config.
  Why: graph views, rich view metadata, positions, styles, and UI-specific mapping should keep TypeScript ergonomics.
- Headless flows are a first-class goal.
  Why: a developer should be able to add a contract-only flow and immediately get filtered logs, traces, journeys, and reporting views without needing a diagram first.
- Auto-layout is explicitly out of scope for v1.
  Why: the current plan should not block on automatic layout quality; manual TS-authored graph views are acceptable for v1.

## Tests / Validation
- No Django-specific work here; this repo should use Rust integration tests, Vitest, build/lint, and local fanout smoke tests.
- Phase-by-phase is the right strategy, and each phase below includes concrete validation steps when practical.
- Relay-focused phases should usually run: `cargo fmt`, `cargo clippy -- -D warnings`, `cd relay && cargo test`
- UI-focused phases should usually run: `cd ui && bun test`, `cd ui && bun run build`
- Integration/doc phases should usually run: `make print-endpoints`, `make verify-ingest`
- Rust quality gates should follow the relevant `resq-agent` conventions too: `cargo fmt` and `cargo clippy -- -D warnings`
- Last implementation phase should add burst/backpressure and live-vs-history coverage before any human soak testing.

## Risks / Unknowns
- Expected laptop-scale burst volume is still fuzzy, so batching and browser buffering need conservative defaults.
- We still need to tune the exact Vector coarse-filter rules and relay keep/drop rules without hiding useful failure context.
- `fullstack` app telemetry emission is future-facing, not confirmed for local OTLP today.
- Rich trace/log drilldown could get heavy if we over-fetch instead of keeping live canvas state lean.

## Planning Instructions
Break implementation into phases, each with subtasks.

**Phase 0: Cleanup + Baseline Commit**
- ❌ Not done. The working tree is still dirty, so cleanup / bogus residue removal / commit slicing is not finished yet.
- Goal: turn the current dirty branch into a deliberate starting point before deeper work.
- Files to change:
- [README.md](/Users/jeremyrojas/worktrees/resq-flow/README.md), [resq-flow.md](/Users/jeremyrojas/worktrees/resq-flow/resq-flow.md), [ARCHITECTURE.md](/Users/jeremyrojas/worktrees/resq-flow/ARCHITECTURE.md), [Makefile](/Users/jeremyrojas/worktrees/resq-flow/Makefile) to keep docs/tooling aligned on collector-compatible mode.
- [relay/Cargo.toml](/Users/jeremyrojas/worktrees/resq-flow/relay/Cargo.toml), [relay/src/lib.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/src/lib.rs), relay tests to preserve the real relay work.
- [ui/src/App.tsx](/Users/jeremyrojas/worktrees/resq-flow/ui/src/App.tsx), [ui/src/core/types.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/types.ts), [ui/src/core/hooks/useFlowAnimations.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/hooks/useFlowAnimations.ts), [ui/src/flows/mail-pipeline.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/flows/mail-pipeline.ts), fixture/tests to preserve the real UI work.
- Delete local junk like `.idea/`.
- Decide whether `collector-compatible-otlp-ingest-plan.md` is folded into docs or removed.
- Decide whether `examples/vector/resq-flow-fanout.yaml` stays here as an example or lives only in `fullstack`.
- Commit intent: one cleanup/docs commit, one relay commit, one UI commit if the diff naturally splits that way.
- Validation:
- Run `git status --short` and confirm bogus residue is gone while intentional work remains.
- If cleanup touches runnable code, run `cd relay && cargo test` and `cd ui && bun test`.

**Phase 1: Early Re-Architecture**
- ✅ Done. Relay modules, shared JSON contracts, and the broad UI orchestration split are in place.
- ❌ Not done. Flow discovery is still partially hardcoded in `ui/src/flows/index.ts`, so new contract-only flows are not yet auto-discovered by the UI.
- Goal: reshape file boundaries before performance/features pile onto the wrong structure.
- Files to change:
- [relay/src/lib.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/src/lib.rs) becomes a thin entrypoint/composition layer.
- Introduce relay modules such as `relay/src/ingest.rs`, `relay/src/ws.rs`, `relay/src/history.rs`, `relay/src/health.rs`, and a shared event/model module.
- [ui/src/App.tsx](/Users/jeremyrojas/worktrees/resq-flow/ui/src/App.tsx) becomes orchestration only.
- Introduce UI hooks/modules that clearly separate `live`, `history`, and `replay` sources.
- Introduce a shared contract layer based on one small JSON contract per flow.
- Keep graph and other rich view configs in TypeScript, loaded separately from the shared contract.
- Introduce a shared flow registry/loader so the relay reads contracts and the UI reads contracts plus any optional registered views instead of hardcoded mail-only logic.
- Reuse and clarify the existing journey/log/timeline model rather than rebuilding it from scratch.
- Exact intent: keep OTLP normalization, WS delivery, and Victoria history access independent on the relay side; keep transport, playback, and visualization derivation independent on the UI side.
- Exact intent for shared flow contracts:
  - define a schema version for each contract file
  - define coarse selectors for relevant telemetry
  - define stable telemetry match keys like `event`, `stage_id`, `queue_name`, `function_name`, `worker_name`, and `span_name`
  - define configurable keep/drop context policy
- Exact intent for TypeScript flow view configs:
  - define graph nodes, edges, grouping, labels, styles, handles, and positions
  - define UI mapping from telemetry fields to node IDs where needed
  - allow richer non-graph view metadata later without forcing the relay to understand it
- Developer-experience goal:
  - adding a headless flow should ideally require adding one small JSON contract file
  - adding a graph view later should require adding one optional TypeScript view config
  - Codex can help generate the first draft, but the system should stay hand-editable and understandable for developers
- Contract example to anchor implementation:
```json
{
  "version": 1,
  "id": "mail-pipeline",
  "name": "Mail Pipeline",
  "telemetry": {
    "log_events": ["mail_e2e_event"],
    "queue_prefixes": ["rrq:queue:mail-"],
    "function_prefixes": ["handle_mail_"],
    "worker_prefixes": ["mail_"],
    "stage_prefixes": ["incoming.", "analyze.", "extract.", "send."]
  },
  "keep_context": {
    "parent_spans": true,
    "root_spans": true,
    "error_events": true,
    "unmapped_events_for_kept_traces": true
  }
}
```
- Flow discovery choice for v1:
  - statically load contracts at startup from a known contracts directory
  - statically register optional TypeScript view configs in the UI
- Inter-module contract note:
  - `ingest` decodes OTLP into internal events
  - contract matching annotates events with match metadata
  - `ws` publishes kept events and recent batches
  - `history` applies the same contract logic to Victoria-backed queries
  - `health` exposes ingest and relay status
- Implementation note: use the relevant parts of [RUST_BEST_PRACTICES.md](/Users/jeremyrojas/worktrees/resq-agent/telemetry-improvements/crates/resq-agent/docs/RUST_BEST_PRACTICES.md) during relay extraction, especially around error propagation, bounded async patterns, and type design.
- Validation:
- Run `cargo fmt`, `cargo clippy -- -D warnings`, and `cd relay && cargo test`.
- Run `cd ui && bun test` if App/hook boundaries changed on the frontend.

**Phase 2: Live Relay Contract**
- ✅ Done. OTLP normalization, contract matching, `matched_flow_ids`, WS batching/snapshots, reconnect buffer behavior, filtering, and ingest health are implemented and covered by relay tests.
- Goal: make the relay a lean, predictable live fanout consumer behind Vector.
- Files to change:
- Relay ingest/WS modules from Phase 1, plus [relay/tests/otlp_to_ws.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/tests/otlp_to_ws.rs), [relay/tests/otlp_logs.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/tests/otlp_logs.rs), [relay/tests/capabilities.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/tests/capabilities.rs), and [relay/tests/ingest_health.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/tests/ingest_health.rs).
- Exact intent per area:
- Normalize OTLP into a stable internal flow-event model with sequence numbers.
- Match incoming events against registered flow contracts and tag kept events with `matched_flow_ids: string[]`.
- Batch outbound WS payloads on a short cadence instead of one event per message.
- Keep a small recent in-memory buffer for reconnect/recent context, not long-term storage.
- Apply flow-aware relay filtering:
  - keep first-class events that map to the active flow/diagram
  - keep related error/root/parent/context events needed to explain or debug the flow
  - drop unrelated telemetry before it reaches the browser
- Default relay keep/drop policy for v1:
  - Keep all `mail_e2e_event` logs that already form the explicit mail pipeline event contract.
  - Keep spans/logs that map to the active flow via `stage_id`, `queue_name`, `function_name`, `worker_name`, `span_name`, `rrq.queue`, `rrq.function`, `messaging.destination.name`, or `messaging.operation`.
  - Keep parent/root/error context for traces that already contain a kept mapped event, even if those context spans are not first-class diagram nodes.
  - Keep unmapped events only when they help explain failure, lineage, or ordering for an otherwise relevant trace.
  - Drop telemetry that is neither mapped nor clearly related to a kept trace.
  - Drop non-mail logs that do not match the explicit `mail_e2e_event` contract.
- Design note:
  - do not require producers to emit UI node IDs directly
  - prefer stable telemetry fields such as `stage_id`, `queue_name`, `function_name`, `worker_name`, and `event`
  - let contract matching decide flow membership, and let the optional TypeScript view config map those telemetry fields to node IDs used by the diagram
- UI/relay contract note:
  - once the relay tags an event with `matched_flow_ids`, the UI should be able to filter by selected flow without re-implementing coarse flow matching in multiple places
- `annotate_flow_event` note:
  - keep the concept, but make it contract-driven rather than mail-specific
  - it should remain responsible for sequence/event-kind/basic annotation
  - flow membership tagging should be added as part of this annotation/matching stage
- Preserve best-effort fanout semantics so `resq-flow` failure never threatens the Victoria path.
- Add simple ingest/backpressure observability so we can tell “relay up” from “relay keeping up.”
- Validation:
- Run `cargo fmt`, `cargo clippy -- -D warnings`, and `cd relay && cargo test`.
- Add or update relay integration tests for batching, reconnect buffer behavior, and keep/drop filtering rules.

**Phase 3: UI Live Path**
- ✅ Done. Live UI uses append-only relay ingestion, history playback is separate from live mode, and headless-flow rendering plus the current detail panels are implemented.
- ❌ Not done. Replay is not a first-class in-app source mode, and some derived session state is still unbounded beyond the relay event buffer.
- Goal: make live mode immediate, smooth, and cheap.
- Files to change:
- [ui/src/core/hooks/useRelayConnection.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/hooks/useRelayConnection.ts)
- [ui/src/core/hooks/useEventPlayback.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/hooks/useEventPlayback.ts)
- [ui/src/App.tsx](/Users/jeremyrojas/worktrees/resq-flow/ui/src/App.tsx)
- [ui/src/core/hooks/useFlowAnimations.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/core/hooks/useFlowAnimations.ts)
- `ui/src/core/hooks/useLogStream.ts`, `ui/src/core/hooks/useTraceTimeline.ts`, `ui/src/core/hooks/useTraceJourney.ts`
- Exact intent per file:
- `useRelayConnection`: move from “append + full re-sort every message” to append-only batched ingestion.
- `useEventPlayback`: replay/history only; no artificial delay in live mode.
- `App.tsx`: explicit source-mode split so live, history, and replay are not fighting each other.
- Derivation hooks: process incrementally, keep bounded memory, and avoid recomputing whole-session state on every burst.
- The graph view should be treated as the first consumer of the normalized flow/journey model, not the only consumer the architecture supports.
- Headless flow note:
  - a contract-only flow should still appear in the selector and support filtered logs, journeys, and history views even if no graph view is registered yet
- Validation:
- Run `cd ui && bun test` and `cd ui && bun run build`.
- Add or update tests proving live mode does not use playback delay semantics.

**Phase 4: History + Detail Path**
- ✅ Done. A contract-aware history API and the main history/detail panels exist.
- ❌ Not done. Drilldowns still depend on a loaded history window instead of targeted on-demand fetches, and dedicated history/detail coverage is still thin.
- Goal: keep live canvas lean while richer logs/traces come from Victoria-backed history on demand.
- Files to change:
- Relay history module and existing history endpoints in [relay/src/lib.rs](/Users/jeremyrojas/worktrees/resq-flow/relay/src/lib.rs) after extraction.
- `ui/src/core/components/BottomLogPanel.tsx`, `ui/src/core/components/NodeDetailPanel.tsx`, `ui/src/core/components/TraceDetailPanel.tsx`
- Exact intent:
- Live path drives animation and recent context.
- History path provides broader windows, richer detail, and deeper drilldowns.
- Keep detailed trace/log fetches targeted so the browser does not need the whole raw telemetry stream for every frame.
- This phase should also leave room for non-graph views such as reports, tables, and trace/log-heavy inspectors to read from the same normalized flow/journey model and history APIs.
- History filtering note:
  - history queries should apply the same contract-driven flow matching/filtering model as live ingest, not a totally separate UI-only filter path
- Validation:
- Run `cd relay && cargo test`, `cd ui && bun test`, and `cd ui && bun run build`.
- Add or update tests for history fetch behavior, truncation/warnings, and detail-panel rendering against history data.

**Phase 5: Vector Fanout Contract + Future Producer Readiness**
- ✅ Done. Docs and the local example fanout config in this repo consistently describe the `Vector -> Victoria + resq-flow` topology and best-effort sink behavior.
- ❌ Not done. Cross-repo verification of the applied `fullstack` Vector config is still outstanding.
- Goal: lock down the safe integration pattern with the shared observability stack.
- Files to change:
- [README.md](/Users/jeremyrojas/worktrees/resq-flow/README.md), [resq-flow.md](/Users/jeremyrojas/worktrees/resq-flow/resq-flow.md), [ARCHITECTURE.md](/Users/jeremyrojas/worktrees/resq-flow/ARCHITECTURE.md), optional `examples/vector/resq-flow-fanout.yaml`
- External coordination file in the other repo: [observability/vector/vector.yaml](/Users/jeremyrojas/worktrees/fullstack/gmail-oauth-unified-handoff-fullstack/observability/vector/vector.yaml)
- Exact intent:
- Document the one true local contract: telemetry goes to Vector once, Vector fans out, Victoria remains primary storage/query.
- Document coarse pre-filtering at the Vector layer:
  - send only traces/logs to `resq-flow` for v1
  - filter to relevant services/domains where practical
  - avoid baking diagram-specific business logic into Vector config
- Default coarse-filter policy for v1:
  - Do not fan out metrics to `resq-flow`.
  - Fan out logs only when they match the explicit mail telemetry contract such as `event = mail_e2e_event`.
  - Fan out traces when they are clearly mail-pipeline-related by stable mail-oriented fields or names, for example queue/function/worker/stage identifiers associated with the mail flow.
  - Prefer filtering by stable domain markers like `mail-` queues, `handle_mail_*` functions, mail worker names, and mail stage IDs before relying heavily on `service.name`.
  - Treat `service.name` as a helpful secondary coarse filter, not the only gate, until local emitted service names are better validated.
  - Keep Vector filtering coarse and cheap; do not encode exact diagram-node membership there.
- Make `resq-flow` sink configuration clearly best-effort.
- Keep `fullstack` app emission out of v1 scope, but document that later producers should join via the same OTLP-to-Vector contract.
- Keep a discoverable fanout example in `resq-flow` if it remains useful, but treat the applied runtime config in `fullstack` as the execution source of truth.
- Future source note:
  - keep the core normalized model source-agnostic enough that later adapters like Datadog or `pup`-driven imports can feed history/detail experiences without forcing a redesign of the live Vector path
- Validation:
- Run `make print-endpoints`.
- Verify docs and example config all describe the same topology and endpoint ownership.

**Phase 6: Automated Hardening**
- ✅ Done. There is solid baseline automated coverage for relay ingest/filtering/WS behavior plus UI hooks/helpers/nodes.
- ❌ Not done. Burst/backpressure coverage, App-level live-vs-history/history UI coverage, history truncation/warnings coverage, and the full hardening gate are still missing.
- Goal: last implementation phase before human testing.
- Files to change:
- Relay integration tests, UI hook/component tests, and fixtures.
- Exact intent:
- Add burst-volume coverage for WS batching and lagging clients.
- Add UI tests for live-vs-replay separation and append-only ordering.
- Add smoke coverage for history mode plus live reconnect behavior.
- Establish a per-flow fixture/test convention:
  - one shared JSON contract file per flow
  - one replay fixture per flow
  - one basic relay-side match/filter test per flow
  - one basic UI log/journey test per flow
  - if a graph view exists, one basic UI mapping/rendering test for that view
- Run `cargo fmt`, `cargo clippy -- -D warnings`, `cd relay && cargo test`, `cd ui && bun test`, `cd ui && bun run build`, and `make verify-ingest` as the final automated gate.

**Phase 7: Human Verification**
- ❌ Not done. I did not find in-repo evidence that the final human verification pass has been completed.
- Goal: final end-to-end confidence check after automated hardening passes.
- What to test:
- Start the local shared observability stack and `resq-flow`, then confirm the live path works through Vector fanout rather than direct-to-relay mode.
- Run a normal local mail e2e flow and verify the canvas updates near-instantly without choppy playback lag.
- Confirm the mapped nodes/edges in [ui/src/flows/mail-pipeline.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/flows/mail-pipeline.ts) light up correctly for the expected path.
- Confirm related but unmapped errors/context still appear in logs or trace details when useful.
- Confirm history mode loads prior events and detail panels show richer trace/log context without breaking live mode.
- Confirm Victoria/Grafana still work if `resq-flow` is stopped or disconnected.
- Confirm reconnect behavior is sane: restarting the relay should recover the UI without requiring a full manual reset.

## Other (Optional)
- Agent handoff note:
- This plan is intended to be executable by another LLM/agent end-to-end with minimal questions.
- If blocked, the agent should pause only for true ambiguities or missing cross-repo access, not for normal implementation choices already decided here.
- Working repos / paths:
  - `resq-flow`: [resq-flow](/Users/jeremyrojas/worktrees/resq-flow)
  - `fullstack`: [gmail-oauth-unified-handoff-fullstack](/Users/jeremyrojas/worktrees/fullstack/gmail-oauth-unified-handoff-fullstack)
  - `resq-agent`: [telemetry-improvements](/Users/jeremyrojas/worktrees/resq-agent/telemetry-improvements)
- Cross-repo ownership:
  - `resq-flow` owns the relay, UI, tests, docs, and local example fanout config.
  - `fullstack` owns the applied local Vector runtime config in [vector.yaml](/Users/jeremyrojas/worktrees/fullstack/gmail-oauth-unified-handoff-fullstack/observability/vector/vector.yaml).
  - `resq-agent` owns the emitted telemetry contract that `resq-flow` maps against.
- Cross-repo dependency and landing order:
  - If the mail telemetry contract is not yet on `resq-agent` `master`, land that first.
  - Land `resq-flow` next so the consumer is ready before shared fanout is enabled.
  - Land the `fullstack` Vector fanout wiring last as the final shared-stack switch-on step.
- Current working agreement while implementing:
  - Local commits are allowed in `resq-flow` if they help keep the refactor organized, but do not push.
  - Changes in `fullstack` and `resq-agent` can be made locally for testing/integration, but do not commit them yet.
- Conventions note:
- `resq-flow` is greenfield, so `resq-agent` docs are a reference point, not a straightjacket.
- We should adopt the parts that improve Rust quality, async safety, and repo hygiene, while skipping rules tied to `resq-agent`-specific runtime, queue, SQLx, SST, or multi-service workflows.
- Resolved planning decisions:
- Optimize v1 for normal dev laptop e2e traffic, not soak-test traffic.
- Filter in layers:
  - Vector performs coarse pre-filtering for obvious unrelated noise.
  - Relay performs flow-aware filtering and normalization.
  - The flow config defines what becomes first-class on the diagram.
- Do not use the diagram as the only ingest filter boundary; keep related error/context events available for detail/debug views.
- It is important to decide the filtering policy now, even if the exact Vector expressions and Rust implementation details are tuned later.
- The reason: relay module boundaries, test cases, and live-vs-history behavior all depend on the agreed keep/drop contract.
- Current-state caveat:
  - today, node matching is mostly driven by [ui/src/flows/mail-pipeline.ts](/Users/jeremyrojas/worktrees/resq-flow/ui/src/flows/mail-pipeline.ts) plus resolver logic in the UI
  - that is enough for the current mail flow UI, but not enough by itself to make new flows automatically “just work” in the relay
- Target-state rule:
  - new flows should work by adding one small shared JSON contract file
  - graph views should be optional TypeScript configs layered on top
  - relay filtering and keep/drop behavior should be driven by configurable contracts, not mail-specific hardcoded logic
- Per-flow convention:
  - each new flow should come with a versioned contract JSON, a replay fixture, and minimal relay/UI tests so “add a flow” stays predictable
- Registration choice:
  - contracts should be file-discovered at startup
  - optional graph views should be registered explicitly in the UI
- View model rule:
  - React Flow graph is the first view, not the core architecture itself
  - reports, tables, timelines, and richer inspectors should be able to sit on top of the same normalized flow/journey model later
- Future producers like `fullstack` should still send to Vector, not directly to `resq-flow`; Vector remains the single fanout point to Victoria and `resq-flow`.
- Keep fanout examples in `resq-flow` when useful for discoverability, while the active applied config still lives in `fullstack`.
- Recommended commit order:
- `cleanup/docs`
- `relay live contract`
- `ui live path`
- `history/detail`
- `docs/integration hardening`

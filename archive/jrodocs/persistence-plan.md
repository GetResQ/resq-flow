# Persistence Plan for Historical Logs in `resq-flow`

## Bottom Line

Historical logs and traces should persist in Victoria, not in `resq-flow`.

`resq-flow` should stay:

- a low-latency live visualizer
- a contract-aware history reader over persisted telemetry
- safe to restart without losing historical data

If we want logs to remain queryable after a `resq-flow` restart, the authoritative path must be:

`producer/agent -> Vector OTLP -> VictoriaLogs / VictoriaTraces -> resq-flow history query`

not:

`producer/agent -> resq-flow directly`

## What I Verified Locally

### 1. Live `resq-flow` state is in-memory only

The relay keeps recent live events in an in-memory `VecDeque` and broadcasts them over websocket. It is not a durable store.

- `relay/src/ws.rs`
- `ui/src/core/hooks/useRelayConnection.ts`

That means:

- restarting the relay clears the live snapshot
- refreshing the browser clears the browser-side live buffer
- this is expected behavior, not a bug

### 2. `resq-flow` already has a history path

The UI calls `/v1/history`, and the relay already queries Victoria-backed stores for history:

- logs from VictoriaLogs at `http://127.0.0.1:9428/select/logsql/query`
- traces from VictoriaTraces at `http://127.0.0.1:10428/select/jaeger/api/...`

Verified in:

- `ui/src/App.tsx`
- `relay/src/history.rs`

So the architecture we want mostly already exists. The missing piece is making sure telemetry always lands in Victoria first, and that the history query semantics are strong enough for logs.

### 3. The shared observability stack is already persistent

In `fullstack/obs-master/docker-compose.yaml`, all three Victoria services use named Docker volumes and `7d` retention:

- `victorialogs-data`
- `victoriatraces-data`
- `victoriametrics-data`

Verified in:

- `/Users/jeremyrojas/worktrees/fullstack/obs-master/docker-compose.yaml`

That means data survives:

- `resq-flow` restarts
- Victoria container restarts
- `docker compose stop` / `start`

That data does **not** survive:

- `docker compose down -v`
- manual Docker volume deletion

### 4. The base shared Vector config persists to Victoria

The current `obs-master` Vector config sends OTLP logs to VictoriaLogs and OTLP traces to VictoriaTraces:

- `/Users/jeremyrojas/worktrees/fullstack/obs-master/observability/vector/vector.yaml`

### 5. Best-effort fanout to `resq-flow` already exists in at least one fullstack worktree

I verified a local fullstack worktree with the intended dual-write shape:

- persist everything to Victoria
- fan out filtered logs/traces to `resq-flow`
- make the `resq-flow` sinks best-effort with in-memory buffering and `drop_newest`

Verified in:

- `/Users/jeremyrojas/worktrees/fullstack/gmail-oauth-unified-handoff-fullstack/observability/vector/vector.yaml`
- `examples/vector/resq-flow-fanout.yaml`

This is important because it proves the target design is not hypothetical. It already exists locally in the right form.

### 6. Grafana is present, but I did not find repo-managed datasource provisioning

The shared stack starts Grafana:

- `/Users/jeremyrojas/worktrees/fullstack/obs-master/docker-compose.yaml`
- `/Users/jeremyrojas/worktrees/fullstack/obs-master/Makefile`

But I did not find checked-in Grafana datasource provisioning files in that worktree, and the compose file only mounts `/var/lib/grafana`.

Practical implication:

- Grafana can be used for historical exploration
- but datasource setup is not yet repo-automated in the checked-in base config I inspected

## Answer to the Grafana Question

Yes. Victoria is queryable by Grafana, and `resq-flow` history is conceptually similar.

The difference is:

- Grafana is a general-purpose UI over stored telemetry
- `resq-flow` is a specialized UI that reconstructs flow-aware history from stored telemetry

For logs:

- VictoriaLogs exposes LogSQL query APIs
- Grafana can use the VictoriaLogs datasource

For traces:

- VictoriaTraces exposes Jaeger-compatible query APIs
- Grafana can use a Jaeger datasource pointed at VictoriaTraces

So the right mental model is:

- Victoria is the durable system of record
- Grafana and `resq-flow` are both readers on top of that persisted data

## The Current Gap

This is the most important finding from the code review.

### `resq-flow` live matching is broader than `resq-flow` historical log retrieval

Live event matching in `relay/src/contracts.rs` can match a flow by:

- `event`
- `queue_name`
- `function_name`
- `worker_name`
- `stage_id`
- `span_name`
- kept trace context

But the historical **log** query builder currently starts only from `contract.telemetry.log_events`.

For `mail-pipeline`, that is currently:

- `mail_e2e_event`

Verified in:

- `relay/src/contracts.rs`
- `ui/src/flow-contracts/mail-pipeline.json`

### What that means in practice

A log can appear live in `resq-flow` and still fail to come back historically if:

- it matched live flow rules through queue/function/stage/span context
- but it did not have `event=mail_e2e_event`
- and it therefore was never fetched by the VictoriaLogs history query

This is likely the biggest reason historical logs may feel inconsistent today.

## Recommended Architecture

### 1. Make the shared OTLP collector path authoritative

Anything we care about after restart must go to the shared Vector OTLP endpoints first.

Authoritative ingest path:

- OTLP gRPC: `:4317`
- OTLP HTTP: `:4318`

Do **not** treat `resq-flow` `/v1/logs` or `/v1/traces` as the normal ingest target for durable telemetry.

Use direct-to-relay only for isolated debugging.

### 2. Persist first, fan out second

Vector should always:

- send logs to VictoriaLogs
- send traces to VictoriaTraces
- optionally fan out a filtered copy to `resq-flow`

The fanout to `resq-flow` should remain:

- best-effort
- no retries
- short timeout
- in-memory buffer
- safe to drop when `resq-flow` is unavailable

That preserves the correct priority:

- Victoria is durable and primary
- `resq-flow` is fast and disposable

### 3. Keep `resq-flow` stateless

I do **not** recommend adding a local embedded database or on-disk event store to `resq-flow`.

Reasons:

- it duplicates Victoria
- it creates a second source of truth
- it complicates retention, backfill, and query semantics
- it solves the wrong layer of the problem

The clean architecture is to keep `resq-flow` as a reader over the persisted observability stack.

### 4. Use Victoria for all historical retrieval

Historical retrieval should come from:

- VictoriaLogs for logs
- VictoriaTraces for spans/traces

`resq-flow` should reconstruct flow history by querying those stores and applying its flow contract logic.

That already exists today in the relay history endpoint.

### 5. Standardize the log schema for historical retrieval

This is the key product/design choice.

We need one canonical way to find "mail pipeline logs" later.

My recommendation:

- keep explicit structured log events as the canonical historical log contract
- require logs intended for flow history to include a stable `event` value such as `mail_e2e_event`
- also require correlation fields such as `trace_id`, `span_id`, `stage_id`, `function_name`, `queue_name`, and `worker_name` whenever they exist

Why I recommend this first:

- it is already aligned with the current `mail-pipeline` contract
- it makes retrieval exact and cheap
- it avoids broad fuzzy historical queries
- it keeps Grafana and `resq-flow` searching the same stored shape

### 6. Close the live/history symmetry gap

After the schema is standardized, we should still tighten the historical behavior so it matches live behavior better.

There are three viable approaches:

1. Preferred near-term:
   Make all historically important mail logs emit the explicit `event` contract, then keep the current history query model.

2. Stronger medium-term:
   Extend `resq-flow` historical log query generation so it can query VictoriaLogs with the same stable selectors used by live matching, not only `log_events`.

3. Strongest long-term:
   Materialize a durable flow key such as `flow_id` or `resq.flow_id` into persisted telemetry so historical lookup becomes exact and cheap.

My recommendation is:

- do `1` first
- evaluate whether `2` is still needed
- only do `3` if we want first-class cross-tool flow querying everywhere

## Retrieval Paths We Should Support

### A. `resq-flow` history UI

Purpose:

- purpose-built historical flow reconstruction
- logs + spans shown together in flow context
- usable after restart as long as data was persisted to Victoria

Backed by:

- `GET /v1/history`
- VictoriaLogs LogSQL query API
- VictoriaTraces Jaeger query API

### B. Grafana Logs

Purpose:

- broad historical log search
- ad hoc debugging
- cross-service exploration
- team-wide shared dashboards/explore workflows

Recommendation:

- add a VictoriaLogs datasource in Grafana
- point it at VictoriaLogs using the datasource URL format documented by VictoriaMetrics

### C. Grafana Traces

Purpose:

- trace lookup
- span tree inspection
- jumping between trace and log contexts

Recommendation:

- add a Jaeger datasource in Grafana
- point it at VictoriaTraces using the Jaeger-compatible endpoint

## What "Persistent Across Restart" Should Mean

For this project, I would define success as:

- restarting `resq-flow` does not lose access to historical logs or traces
- restarting Grafana does not lose access to historical logs or traces
- restarting Vector does not lose already-ingested historical logs or traces
- restarting Victoria containers does not lose data because of named volumes

It is acceptable that:

- the live websocket buffer is lost on `resq-flow` restart
- very recent best-effort fanout events may be missed while `resq-flow` is down

It is **not** acceptable that:

- a log only exists in `resq-flow` live memory and nowhere durable

## Concrete Rollout Plan

### Phase 1: Make persistence the default path

- Standardize that producers/agents send OTLP to shared Vector, not directly to `resq-flow`
- Ensure the active Vector config writes all logs/traces to Victoria
- Ensure the active Vector config fans out filtered copies to `resq-flow`
- Keep the `resq-flow` fanout best-effort

### Phase 2: Make history usable

- Continue using `resq-flow` `/v1/history` as the flow-specific reader
- Verify host-side relay connectivity to `127.0.0.1:9428` and `127.0.0.1:10428`
- Increase retention beyond `7d` if needed for the team's debugging horizon

### Phase 3: Make Grafana first-class

- Provision a VictoriaLogs datasource
- Provision a Jaeger datasource for VictoriaTraces
- Add one or two default dashboards or Explore links for mail flow debugging

### Phase 4: Remove historical ambiguity

- Require canonical `event` values for logs that must be recoverable historically
- Optionally widen the `resq-flow` historical log query logic if we need parity with live matching

## My Recommendation

If we want the cleanest, lowest-risk outcome:

1. Use Victoria as the only durable store.
2. Treat `resq-flow` as stateless and restartable.
3. Make Vector the mandatory ingest entrypoint for anything we care about historically.
4. Keep best-effort fanout from Vector to `resq-flow`.
5. Standardize historical log contracts around explicit structured `event` values plus correlation fields.
6. Add Grafana datasources so historical exploration is available even outside `resq-flow`.

That gives us:

- persistence across `resq-flow` restart
- one durable source of truth
- a clean separation between storage and visualization
- a path for both purpose-built flow UX and generic Grafana debugging

## References

### Local files inspected

- `relay/src/ws.rs`
- `relay/src/history.rs`
- `relay/src/contracts.rs`
- `ui/src/App.tsx`
- `ui/src/flow-contracts/mail-pipeline.json`
- `examples/vector/resq-flow-fanout.yaml`
- `/Users/jeremyrojas/worktrees/fullstack/obs-master/observability/vector/vector.yaml`
- `/Users/jeremyrojas/worktrees/fullstack/obs-master/docker-compose.yaml`
- `/Users/jeremyrojas/worktrees/fullstack/obs-master/Makefile`
- `/Users/jeremyrojas/worktrees/fullstack/gmail-oauth-unified-handoff-fullstack/observability/vector/vector.yaml`

### Official docs verified

- VictoriaLogs querying: https://docs.victoriametrics.com/victorialogs/querying/
- VictoriaLogs Grafana datasource: https://docs.victoriametrics.com/victorialogs-data-source/
- VictoriaTraces Grafana datasource: https://docs.victoriametrics.com/victoriatraces/data-ingestion/grafana-datasource/
- Grafana Jaeger datasource: https://grafana.com/docs/grafana/latest/datasources/jaeger/

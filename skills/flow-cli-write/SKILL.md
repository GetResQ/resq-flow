---
name: flow-cli-write
description: Use this skill when the user wants to add or change flow-visible logs for an existing flow, either by adding runtime logs in application code that should show up in resq-flow or by manually emitting one explicit debug log with the resq-flow CLI. It helps developers find the right existing flow, choose between canonical typed telemetry and ad hoc breadcrumbs, reuse the normal flow telemetry path, keep scope explicit, and validate the result with the resq-flow CLI. Do not use it for raw infrastructure logs or brand-new flow scaffolding.
---

# resq-flow Runtime Logs

Use this skill when the task is about writing logs into `resq-flow`.

This includes two write paths:

- runtime instrumentation in app code
- manual CLI emits for quick local debugging

This is the producer-side companion to `flow-cli-read`.

## What this skill is for

Use it to:

- add flow-visible runtime logs in existing code for an existing flow
- change existing flow-visible runtime logs
- emit one manual debug log with the CLI
- identify the right existing flow and flow context
- choose the right log style for the change
- keep flow scope explicit
- validate the result with `resq-flow`

Do not use it for:

- raw Docker or service logs
- Datadog or Victoria-only log searches
- inventing a second telemetry pipeline
- scaffolding a brand-new flow from scratch; use `flow-cli-create` for that

## Default rule

Prefer flow-scoped runtime logs.

Treat global logs as a manual debugging fallback only:

- `resq-flow logs emit --global` is fine for a quick local breadcrumb
- it is not the normal runtime instrumentation model

## First step

Figure out which of these the user wants:

1. add runtime logs to an existing flow
2. inspect whether an existing runtime log is already visible in a flow
3. add a temporary manual debug breadcrumb instead of real instrumentation

If the user names a flow, use it.

If the user does not name a flow, infer it from repo context when it is obvious. If not obvious, ask one short question.

## Canonical vs ad hoc

This skill should choose between two producer-side patterns:

- canonical typed telemetry
- ad hoc breadcrumbs

Use canonical typed telemetry when the event is part of the flow's stable backbone:

- queue enqueue
- worker pickup or result
- core stage outcomes such as `final_result`
- stable business or lifecycle events the flow will rely on long-term

Use ad hoc breadcrumbs when the event is a small local visibility point:

- one extra branch or decision log
- one extra save or write breadcrumb
- a useful incremental log that should stay flow-attached but does not need to expand the typed contract

The user usually should not have to choose. Infer the right path from the request.

## Runtime instrumentation workflow

1. Find the existing flow contract and the nearest producer-side telemetry seam.
2. Reuse the normal flow telemetry path already used by that flow.
3. Keep flow scope explicit with the existing flow identity and run identity.
4. Choose the right log style:
   - use canonical typed telemetry for stable lifecycle events
   - use the ad hoc helper for incremental breadcrumbs
5. Add a clear stage id and message. Let flow and node identity come from the bound context.
5. Validate the result with `resq-flow`.

## Rules

- Reuse the existing flow telemetry / tracing path in the producer app.
- Keep flow scope explicit.
- Do not shell out to `resq-flow logs emit` from runtime code.
- Do not create a second CLI-specific telemetry path.
- Prefer existing bound flow or node contexts over ad hoc logging.
- Do not pass `flow_id`, `run_id`, or `component_id` manually when the bound context already knows them.
- Prefer the smallest callsite that still preserves correct scope.
- Keep manual CLI attrs small, flat, and useful for filtering.
- Do not overwrite reserved flow fields such as `flow_id`, `run_id`, `component_id`, `status`, `stage_id`, or `message` with extra attrs.

## Good runtime log shape

For runtime code, aim for a small, useful record:

- flow
- run
- stage
- message

For ad hoc breadcrumbs, prefer the tiny helper shape:

- `ad_hoc_ok(stage_id, message)`
- `ad_hoc_err(stage_id, message, error_message)`

Use the existing typed telemetry pattern instead when the log is a canonical lifecycle event.

## Validation workflow

After adding instrumentation, validate with `resq-flow`:

```bash
resq-flow logs tail --flow mail-pipeline
resq-flow logs list --flow mail-pipeline --query extract
resq-flow logs list --flow mail-pipeline --attr thread_id=<thread_id> --jsonl
```

Use `--all` only when the user explicitly wants to inspect global or cross-flow logs.

## Manual CLI emit workflow

Use `logs emit` when the user wants one quick explicit debug signal in the live relay path.

Flow-scoped manual emit:

```bash
resq-flow logs emit --flow mail-pipeline --message "picked thread for analysis" --attr run_id=thread-301 --attr stage_id=analyze.decision
```

Unscoped manual emit:

```bash
resq-flow logs emit --global --message "relay smoke check"
```

Rules for manual emits:

- use `--flow <flow-id>` when the breadcrumb should belong to a flow
- use `--global` only when the user explicitly wants it unscoped
- remember that manual emits write to the live relay path, not application runtime code

## Mail-focused first pass

For `resq-mail`, prefer the existing mail telemetry path and node context helpers. The normal path is already flow-scoped and is what should power mail runtime logs in `resq-flow`.

If a change is mail-specific, default to `mail-pipeline` unless the code clearly belongs to another flow.

For existing mail flow work:

- use typed telemetry for queue, worker, and core stage lifecycle events
- use the ad hoc helper for local breadcrumbs such as `resolve_identity`

## Manual debug fallback

If the user only wants a temporary local breadcrumb and does not need real runtime instrumentation, emit either:

- `resq-flow logs emit --flow <flow-id>` for a manual flow-scoped debug log
- `resq-flow logs emit --global` only when they explicitly want an unscoped debug log

That fallback is for manual debugging, not durable app instrumentation.

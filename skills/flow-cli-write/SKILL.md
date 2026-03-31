---
name: flow-cli-write
description: Use this skill when the user wants to write logs into the resq-flow world, either by adding runtime logs in application code that should show up in resq-flow or by manually emitting one explicit debug log with the resq-flow CLI. It helps developers find the right existing flow, reuse the normal flow telemetry path, keep scope explicit, and validate the result with the resq-flow CLI. Do not use it for raw infrastructure logs.
---

# resq-flow Runtime Logs

Use this skill when the task is about writing logs into `resq-flow`.

This includes two write paths:

- runtime instrumentation in app code
- manual CLI emits for quick local debugging

This is the producer-side companion to `flow-cli-read`.

## What this skill is for

Use it to:

- add flow-visible runtime logs in existing code
- emit one manual debug log with the CLI
- identify the right existing flow and flow context
- keep flow scope explicit
- validate the result with `resq-flow`

Do not use it for:

- raw Docker or service logs
- Datadog or Victoria-only log searches
- inventing a second telemetry pipeline

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

## Runtime instrumentation workflow

1. Find the existing flow contract and the nearest producer-side telemetry seam.
2. Reuse the normal flow telemetry path already used by that flow.
3. Keep flow scope explicit with the existing flow identity and run identity.
4. Add a clear stage id, status, message, and a few useful attrs.
5. Validate the result with `resq-flow`.

## Rules

- Reuse the existing flow telemetry / tracing path in the producer app.
- Keep flow scope explicit.
- Do not shell out to `resq-flow logs emit` from runtime code.
- Do not create a second CLI-specific telemetry path.
- Prefer existing bound flow or node contexts over ad hoc logging.
- Keep added attrs small, flat, and useful for filtering.
- Do not overwrite reserved flow fields such as `flow_id`, `run_id`, `component_id`, `status`, `stage_id`, or `message` with extra attrs.

## Good runtime log shape

Aim for a small, useful record:

- flow
- run
- stage
- message
- a few attrs that help inspection later

Typical attrs:

- `thread_id`
- `job_id`
- `reason_code`
- `customers_identified`
- `queue_name`

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

## Manual debug fallback

If the user only wants a temporary local breadcrumb and does not need real runtime instrumentation, emit either:

- `resq-flow logs emit --flow <flow-id>` for a manual flow-scoped debug log
- `resq-flow logs emit --global` only when they explicitly want an unscoped debug log

That fallback is for manual debugging, not durable app instrumentation.

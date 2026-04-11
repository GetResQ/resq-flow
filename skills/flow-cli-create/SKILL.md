---
name: flow-cli-create
description: Use this skill when the user wants to create or scaffold a new flow that should show up in resq-flow. It helps developers define the flow boundary, choose flow and node names, add the core node logs the flow needs, add any clearly requested initial step logs, create the matching resq-flow contract, and validate the result with resq-flow. Do not use it for raw infrastructure logs or for simple log additions to an already existing flow.
---

# resq-flow Flow Creation

Use this skill when the task is about creating a brand-new flow that should show up in `resq-flow`.

This is the producer-side scaffolding companion to:

- `flow-cli-read` for inspecting logs
- `flow-cli-write` for adding or changing logs in an existing flow

## Quick routing

Use this skill when:

- the user wants a brand-new first-class flow in `resq-flow`
- the work needs a new flow contract, new flow identity, and the initial backbone logs
- the request is clearly about creating a new flow, not just adding visibility

Do not use this skill when:

- an existing flow already fits
- the user explicitly says they do not want a new flow
- the task is just ordinary application or infrastructure logging

Route elsewhere when:

- existing flow logging work belongs in `flow-cli-write`
- validation or troubleshooting belongs in `flow-cli-read`
- non-flow logging belongs in the application's normal log tooling

## What this skill is for

Use it to:

- create a new flow boundary and flow identity
- choose or confirm node and component names
- add the core node logs the flow needs
- add any clearly requested initial step logs
- create the matching `resq-flow` contract
- validate the result with `resq-flow`

Do not use it for:

- raw Docker or service logs
- Datadog or Victoria-only log searches
- simple incremental logging changes inside an already existing flow; use `flow-cli-write`
- requests that explicitly do not want a new flow

## Quick Context

Start with the local repo docs:

- `AGENTS.md`
- `README.md`
- `ARCHITECTURE.md`
- `docs/flow-event-contract.md`
- `docs/cli.md`
- `ui/src/flow-contracts/*.json`

## First step

Figure out the minimum flow definition:

1. what is the flow for
2. what should the flow be called
3. what are the main nodes or components
4. what execution identity scopes the flow, such as thread, run, job, or request
5. if this flow should support Runs, what concrete unit of work gets one producer-owned `run_id`

Infer these from context when the codebase already makes them obvious. If something important is still unclear, ask one short question.

Before proceeding, confirm that this really is a new-flow task:

- if an existing flow already fits, stop and use `flow-cli-write`
- if the user says they do not want a new flow, stop and use `flow-cli-write` or ordinary app logging instead

## Default rule

When creating a new flow, add the core node logs first.

That means the stable backbone of the flow should exist from the start:

- queue enqueue
- worker pickup
- worker result
- core step outcomes such as `final-result`

If the user also wants smaller local visibility points, add those as step logs after the backbone exists.

## Node logs vs step logs during flow creation

When a create-flow request includes both major flow steps and smaller local logs:

- use node logs for the main flow backbone
- use step logs for the smaller local visibility points

The user should not have to split that request up manually. Do the decomposition in the implementation.

## Workflow

1. Find the nearest existing runtime and telemetry patterns in the producer repo.
2. Choose a simple flow name and stable node names that match existing naming patterns.
3. Add the producer-side telemetry scaffold using the standard base shape:
   - `definition.rs`
   - `node_context.rs`
   - `schema.rs`
   - `tracing_emit.rs`
   - optional `touchpoints.rs`
4. Add the producer-side flow context, core node logs, and run identity shape when the flow should support Runs.
5. Add one or more initial step logs only when they were clearly requested or obviously useful.
6. Create the matching `resq-flow` contract.
7. Validate the new flow with `resq-flow`.

## Rules

- Reuse the normal flow telemetry path in the producer app.
- Do not create a second telemetry pipeline.
- Do not create a new flow unless the user clearly wants a new first-class `resq-flow` flow.
- Keep flow scope explicit.
- Keep `flow_id` simple and stable.
- Keep node ownership explicit.
- Keep run ownership explicit. If the flow should support Runs, the producer should mint and carry `run_id` across one coherent execution.
- A Run is one coherent execution story, not every event the flow emits.
- Treat node logs as the default for new-flow scaffolding.
- Use step logs only for smaller local visibility points, not as a replacement for the flow backbone.

## Naming guidance

Prefer:

- simple stable `flow_id`
- explicit node or component names
- child-step `step_id` values
- human-facing references in the form `component_id.step_id`

Do not encode the whole node path into `step_id` when the node identity already exists separately.

## Validation workflow

After the new flow is scaffolded, validate with `resq-flow`:

```bash
resq-flow status
resq-flow logs tail --flow <flow-id>
resq-flow logs list --flow <flow-id> --window 15m --jsonl
```

If the flow includes a natural run identifier, use it to narrow inspection:

```bash
resq-flow logs list --flow <flow-id> --attr run_id=<run-id> --jsonl
```

If the flow should support Runs in the UI, also validate that one producer-emitted `run_id` stays stable across the full lifecycle you expect to group together.

## Run ID implementation recipe

If the flow should support Runs, follow this exact producer-side pattern:

1. decide the one concrete unit of work that should become a Run
2. mint one `run_id` exactly once when that work starts
3. store that `run_id` on the top-level job or request payload
4. carry the same `run_id` unchanged through downstream jobs, worker handoffs, and emitted flow events
5. leave `run_id` absent for flow-visible activity that should not become a top-level Run
6. validate in `resq-flow` that one execution produces one Run row

Use the shared helper in the producer runtime:

- `mint_flow_run_id(flow_id)`

The current mail flow wraps that helper as:

- `mint_mail_run_id() -> "mail-pipeline_<uuid-v4>"`

Keep the pattern generic:

- flow-specific wrapper around the shared mint helper
- one mint point in the producer
- optional `run_id` field on job payloads when some flow-visible activity should stay outside Runs
- downstream propagation by reusing the existing `run_id`, not re-minting

## Mail-focused first pass

For `resq-mail`, prefer the existing mail telemetry path and naming style as the reference pattern.

If the task is mail-specific and the user is not truly creating a new flow boundary, do not use this skill. Use `flow-cli-write` instead.

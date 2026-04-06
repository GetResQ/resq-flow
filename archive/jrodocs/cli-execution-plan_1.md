# resq-flow CLI Execution Plan

## Purpose

This document is the implementation plan for the first `resq-flow` CLI MVP.

It is written so an LLM/agent can execute the work with minimal human intervention while staying inside a narrow, useful scope.

## MVP

Build only these commands in v1:

- `resq-flow status`
- `resq-flow logs list`
- `resq-flow logs tail`

This plan is intentionally narrow so the first version lands quickly and helps the current `mail-pipeline` workflow. Additional commands can be added later when we have real usage feedback.

## Product Direction

Build a TypeScript CLI in this repo under a new top-level `cli/` package.

Use Bun for local dev/build tooling, while keeping the runtime code Node-compatible in v1.

Use `resq-flow` as the canonical executable name.

Do not make `flow` the canonical executable in v1.

## Execution Principles

- Reuse existing relay APIs and semantics.
- Do not invent a second flow model.
- Keep the CLI separate from the UI package.
- Keep the MVP internal-only and minimal.
- Prefer deterministic machine-friendly output for agent use.
- If blocked by missing relay behavior, pause and document the blocker before expanding scope.

## Current Relay Surfaces Available Now

The MVP should build on relay surfaces that already exist today:

- `/health`
- `/health/ingest`
- `/capabilities`
- `/v1/history`
- `/ws`

There are no planned relay API changes in this MVP.

For `/v1/history`, the relay already supports these query parameters:

- `flow_id`
- `window`
- `query`
- `limit`
- `from`
- `to`

## Autonomous Testing Approach

The implementing agent should validate as much as possible autonomously from the terminal after each phase.

Testing should be done by running real local commands directly, such as:

- `bun` commands for the CLI package
- `cargo` commands for the relay
- `make` commands where a repo target already exists

When a phase needs a live relay process, the agent should:

1. Start the relay in the terminal.
2. Run the relevant CLI command or test command in a separate terminal invocation.
3. Inspect stdout, stderr, and exit code.
4. Stop the relay cleanly when done.

The agent should only pause if:

- a command cannot run in the current environment
- a required dependency is missing
- the current repo behavior blocks the MVP and requires a product decision

## Important Repo Note

This worktree may contain unrelated local changes. Any agent executing this plan in this same worktree must avoid reverting or overwriting unrelated local changes.

## Locked MVP Command Contract

### Global CLI behavior

Supported anywhere at the top-level entrypoint:

- `--help`
- `--version`

Behavior requirements:

- unknown commands and unknown flags should print a short error to stderr and exit non-zero
- help and version should not require the relay to be running

### `resq-flow status`

Supported args:

- `--url <base-url>`
- `--json`
- `--timeout <ms>`

### `resq-flow logs list`

Supported args:

- `--flow <flow-id>`
- `--window <duration>`
- `--attr <key=value>` repeatable
- `--query <text>`
- `--limit <n>`
- `--json`
- `--jsonl`
- `--url <base-url>`

Behavior requirements:

- `--flow` should be required in the MVP
- do not add `--var`
- use `--attr key=value` instead
- `--window` format should be `<number><unit>` where unit is `s`, `m`, or `h`

### `resq-flow logs tail`

Supported args:

- `--flow <flow-id>`
- `--attr <key=value>` repeatable
- `--query <text>`
- `--jsonl`
- `--url <base-url>`

Behavior requirements:

- `--flow` should be required in the MVP
- for streaming, support `--jsonl`, not `--json`

## Recommended Package Layout

Create a new top-level `cli/` package instead of putting the CLI inside `ui/`.

Reason:

- the CLI is part of the `resq-flow` product surface, not a UI concern
- the CLI should not inherit Vite/browser-specific structure
- packaging and tests stay simpler
- the executable can be exposed cleanly as `resq-flow`

## Phase 0: Scaffold The CLI Package

### Goal

Create the minimal CLI package skeleton needed to host the three MVP commands.

### Files to create

- `cli/package.json`
- `cli/tsconfig.json`
- `cli/src/index.ts`
- `cli/src/types.ts`
- `cli/src/lib/config.ts`
- `cli/src/lib/errors.ts`
- `cli/src/lib/output.ts`
- `cli/src/lib/http.ts`
- `cli/src/commands/status.ts`
- `cli/src/__tests__/smoke.test.ts`

### Files to change

- `.gitignore`

### Exact changes

#### `cli/package.json`

Create a standalone package with:

- internal package name
- `type: "module"`
- `bin` entry exposing `resq-flow`
- Bun-based scripts for `build` and `test`
- compiled output to `dist/`
- a WebSocket client dependency suitable for Node-compatible runtime use in v1

The package should be installable independently and should not depend on the UI build.

Use Node-compatible runtime APIs where possible:

- `fetch`
- `URL`
- `process.argv`
- `AbortController`

Do not rely on Bun-native runtime behavior alone for WebSocket support. Add a small dependency such as `ws`.

#### `cli/tsconfig.json`

Create a CLI-specific TypeScript config that emits runnable output to `dist/`.

Do not reuse the browser-oriented `ui` tsconfig.

#### `cli/src/index.ts`

Create the root command entrypoint.

Responsibilities:

- parse argv
- register the `status` and `logs` command trees
- print help
- print version
- return stable exit codes
- route to handlers
- reject unknown commands and flags with a short stderr message and non-zero exit code

Keep parser complexity low. Prefer a small parser or simple manual parsing over a heavyweight framework.

#### `cli/src/types.ts`

Define TypeScript shapes for:

- relay health payloads
- relay ingest health payloads
- relay capabilities payloads
- relay history payloads
- normalized CLI log rows

Keep them aligned with the relay’s JSON responses.

The relay response uses the field name `type`, with values such as:

- `log`
- `span_start`
- `span_end`

The CLI may normalize internally, but it must stay aligned with the relay contract.

#### `cli/src/lib/config.ts`

Add logic for resolving:

- base URL
- default time window
- output mode
- timeout

Default base URL should be `http://localhost:4200`.

#### `cli/src/lib/errors.ts`

Create one place for:

- network error normalization
- bad-argument errors
- empty-result handling
- exit code mapping

#### `cli/src/lib/output.ts`

Add helpers for:

- human-readable output
- `--json`
- `--jsonl`

#### `cli/src/lib/http.ts`

Create a small HTTP helper for relay calls.

Responsibilities:

- build URLs safely
- enforce request timeouts
- parse JSON responses
- throw consistent errors

#### `cli/src/commands/status.ts`

Stub the `status` command module so the package builds and the command tree is ready for implementation.

#### `.gitignore`

Add ignores for:

- `cli/node_modules/`
- `cli/dist/`
- `cli/.bun/`
- any CLI coverage output if created

### Completion checks

- `cd cli && bun run build`
- `cd cli && bun test`

### Exit criteria

- the CLI package builds
- the binary entry exists
- help output works

### Autonomous verification note

The agent should run the build and test commands directly in the terminal at the end of the phase and confirm they succeed before moving on.

## Phase 1: Implement `resq-flow status`

### Goal

Ship the smallest useful command first.

### Files to create

- `cli/src/__tests__/status.test.ts`

### Files to change

- `cli/src/index.ts`
- `cli/src/types.ts`
- `cli/src/lib/config.ts`
- `cli/src/lib/errors.ts`
- `cli/src/lib/http.ts`
- `cli/src/lib/output.ts`
- `cli/src/commands/status.ts`
- `cli/src/__tests__/smoke.test.ts`

### Exact changes

#### `cli/src/commands/status.ts`

Implement `resq-flow status`.

Behavior:

- call `/health`
- call `/health/ingest`
- call `/capabilities`
- print a compact health summary by default
- support `--json`

The command should answer:

- is the relay reachable
- are logs arriving
- are traces arriving
- what base URL is being used

#### `cli/src/__tests__/status.test.ts`

Add command-level tests using mocked HTTP responses.

Test:

- success output
- JSON output
- relay unreachable error
- timeout behavior
- unknown flag failure

### Completion checks

- `cd cli && bun test src/__tests__/status.test.ts`
- `cd cli && bun run build`

### Exit criteria

- `resq-flow status` works against a live relay
- JSON output is stable enough for agents

### Autonomous verification note

At the end of this phase, the agent should verify both unit tests and a live relay smoke check.

Recommended terminal sequence:

1. Start the relay.
2. Run `resq-flow status`.
3. Run `resq-flow status --json`.
4. Confirm output and exit codes.

## Phase 2: Implement `resq-flow logs list`

### Goal

Ship the first inspection command for recent `mail-pipeline` logs.

### Files to create

- `cli/src/lib/history.ts`
- `cli/src/lib/filters.ts`
- `cli/src/commands/logs.ts`
- `cli/src/__tests__/history.test.ts`
- `cli/src/__tests__/filters.test.ts`
- `cli/src/__tests__/logs-list.test.ts`

### Files to change

- `cli/src/index.ts`
- `cli/src/types.ts`
- `cli/src/lib/http.ts`
- `cli/src/lib/output.ts`

### Exact changes

#### `cli/src/lib/history.ts`

Fetch `/v1/history` and normalize the response.

MVP behavior:

- require `--flow`
- pass `flow_id` to the relay
- pass `window`, `query`, and `limit` when provided
- keep only events whose raw relay `type` field is `"log"`

The CLI may use an internal normalized row type, but the filtering rule must remain aligned with the relay response shape.

#### `cli/src/lib/filters.ts`

Support:

- repeated `--attr key=value`
- optional `--query`

Attribute filtering should check normalized event attributes exactly.

The current `mail-pipeline` replay fixture already contains log attributes such as:

- `thread_id`
- `stage_id`
- `run_id`
- `flow_id`
- `function_name`
- `queue_name`
- `worker_name`

These are valid examples for human testing and agent validation.

#### `cli/src/commands/logs.ts`

Implement `logs list`.

Behavior:

- fetch normalized history rows
- apply exact attribute filters
- render a compact default table/list
- support `--json` and `--jsonl`

Default output should make these fields easy to scan:

- timestamp
- flow
- run identifier if present
- stage or component if present
- status if present
- message

Do not overbuild columns beyond those fields.

For the default human-readable output, promote these values from log attributes when present:

- stage column: prefer `stage_id`, then `stage_name`, then `component_id`
- status column: use `status`
- run identifier column: use `run_id`

#### Tests

Use mocked `/v1/history` responses for command-level tests.

Test:

- default output
- `--json`
- `--jsonl`
- `--attr`
- `--query`
- empty results

### Completion checks

- `cd cli && bun test src/__tests__/history.test.ts src/__tests__/filters.test.ts`
- `cd cli && bun test src/__tests__/logs-list.test.ts`
- `cd cli && bun run build`

### Exit criteria

- `resq-flow logs list --flow mail-pipeline` works
- filtering by repeated `--attr` works
- output is stable for agent consumption

### Autonomous verification note

At the end of this phase, the agent should:

1. Start the relay.
2. Ensure there is test data available through existing fixtures, replay tooling, or a test relay setup.
3. Run `resq-flow logs list --flow mail-pipeline`.
4. Run one filtered example such as `--attr thread_id=thread-201`.
5. Run JSON output and confirm it parses cleanly.

## Phase 3: Implement `resq-flow logs tail`

### Goal

Ship live log streaming for direct debugging and agent validation.

### Files to create

- `cli/src/lib/ws.ts`
- `cli/src/__tests__/ws.test.ts`
- `cli/src/__tests__/logs-tail.test.ts`

### Files to change

- `cli/src/index.ts`
- `cli/src/types.ts`
- `cli/src/lib/filters.ts`
- `cli/src/commands/logs.ts`

### Exact changes

#### `cli/src/lib/ws.ts`

Implement a small WebSocket client that:

- connects to `/ws`
- parses `snapshot` and `batch`
- normalizes log events only
- deduplicates by `seq`
- supports graceful shutdown

#### `cli/src/commands/logs.ts`

Add the `tail` subcommand.

Behavior:

- require `--flow`
- subscribe to the live stream
- keep only log events for the requested flow
- apply repeated `--attr` filters and optional `--query`
- print matching rows as they arrive
- support human-readable output and `--jsonl`

Do not support plain `--json` for `tail`.

#### Tests

Add unit tests for:

- envelope parsing
- sequence dedupe
- flow filtering
- attr filtering
- JSONL streaming output

### Completion checks

- `cd cli && bun test src/__tests__/ws.test.ts src/__tests__/logs-tail.test.ts`
- `cd cli && bun run build`

### Exit criteria

- `resq-flow logs tail --flow mail-pipeline` works against a live relay
- snapshot and batch handling are correct

### Autonomous verification note

At the end of this phase, the agent should:

1. Start the relay.
2. Start `resq-flow logs tail --flow mail-pipeline` in one terminal session.
3. Trigger or replay matching log traffic in another terminal session.
4. Confirm matching lines stream through.
5. Confirm `--jsonl` emits valid line-delimited JSON.

## Phase 4: Docs And Repo Plumbing

### Goal

Make the MVP discoverable and runnable.

### Files to change

- `README.md`
- `Makefile`
- `resq-flow.md`

### Exact changes

#### `README.md`

Add a CLI section that explains:

- what the MVP CLI is for
- where the CLI lives
- how to build and run it locally
- the three MVP commands
- the supported args for `logs list` and `logs tail`

#### `Makefile`

Add minimal CLI targets:

- `test-cli`
- `build-cli`

Only add convenience targets that clearly reduce friction.

#### `resq-flow.md`

Add a short section under a `## CLI` heading that positions the CLI as the headless interface for status and logs inspection.

Keep this section to roughly 3-5 lines and point readers to the main README for examples and detailed usage.

### Completion checks

- `cd cli && bun run build`
- `make test-cli`

### Exit criteria

- a contributor or agent can discover and run the CLI from repo docs alone

### Autonomous verification note

At the end of this phase, the agent should follow the updated docs literally from the terminal and confirm the documented commands still work as written.

## Phase 5: Automated Verification Before Human Testing

### Goal

Add as much automated confidence as possible before manual testing.

This is the last phase before human testing.

### Testing strategy

This repo does not contain Django, so Django shell is not the primary validation mechanism here.

For this MVP, the automated verification stack should be:

- CLI unit tests
- relay tests already present in this repo
- CLI integration tests against a real relay process

Cross-repo validation with `fullstack` or `resq-agent` can happen after this phase if needed, but it should not replace repo-local automated checks.

### Files to create

- `cli/src/__tests__/integration-status.test.ts`
- `cli/src/__tests__/integration-logs-list.test.ts`
- `cli/src/__tests__/integration-logs-tail.test.ts`

### Files to change

- `Makefile`
- `README.md`

### Exact changes

#### Integration tests

Add tests that:

- start a real relay process or test relay server
- run the compiled CLI as a child process
- post or replay known test telemetry
- assert on stdout, stderr, and exit codes

Hardening requirements:

- use a random free port rather than assuming `4200`
- wait for relay `/health` before starting assertions
- ensure relay cleanup happens in `finally` or equivalent teardown
- fail fast with clear timeout messages if relay startup does not complete

The integration suite must verify:

- `status`
- `logs list`
- `logs tail`

#### Final automated command sequence

The agent should aim to make all of the following pass before handoff:

- `cd relay && cargo test`
- `cd cli && bun test`
- `cd cli && bun run build`
- `make test-cli`
- `make build-cli`

If the agent adds an integration target, it should also pass that target before handoff.

### Exit criteria

- relay tests pass
- CLI unit tests pass
- CLI integration tests pass
- the MVP does not rely only on manual UI confirmation

### Autonomous verification note

This phase is the final automated gate before handoff. The agent should not move to human testing until the terminal verification commands succeed or any failure is clearly documented as a blocker.

## Human Testing

Use `mail-pipeline` as the default manual validation flow.

These examples use attribute keys that already exist in the current `mail-pipeline` replay fixture, including `thread_id`, `stage_id`, `run_id`, `flow_id`, `function_name`, and `worker_name`.

### `resq-flow status`

Supported args:

- `--url <base-url>`
- `--json`
- `--timeout <ms>`

Example:

```bash
resq-flow status
```

Possible output:

```text
Relay: reachable
Status: ok
Logs active: yes
Traces active: yes
Log count (last 60s): 42
Trace count (last 60s): 18
Last log at: 2026-03-23T18:44:12.381Z
Last trace at: 2026-03-23T18:44:11.902Z
Base URL: http://localhost:4200
```

Example:

```bash
resq-flow status --json
```

Possible output:

```json
{
  "relayReachable": true,
  "status": "ok",
  "logsActive": true,
  "tracesActive": true,
  "logCountLast60s": 42,
  "traceCountLast60s": 18,
  "lastLogAt": "2026-03-23T18:44:12.381Z",
  "lastTraceAt": "2026-03-23T18:44:11.902Z",
  "baseUrl": "http://localhost:4200"
}
```

### `resq-flow logs list`

Supported args:

- `--flow <flow-id>`
- `--window <duration>`
- `--attr <key=value>` repeatable
- `--query <text>`
- `--limit <n>`
- `--json`
- `--jsonl`
- `--url <base-url>`

Example:

```bash
resq-flow logs list --flow mail-pipeline --window 15m
```

Possible output:

```text
2026-03-23T18:41:02.110Z  mail-pipeline  thread-201  incoming.fetch_threads      ok     fetched 12 Gmail threads
2026-03-23T18:41:03.482Z  mail-pipeline  thread-201  analyze.decision            ok     classified thread as needs-reply
2026-03-23T18:41:04.005Z  mail-pipeline  thread-201  analyze.draft_insert        ok     inserted reply draft
2026-03-23T18:41:06.901Z  mail-pipeline  thread-201  send.provider_call          error  Gmail API timeout
```

Example:

```bash
resq-flow logs list --flow mail-pipeline --attr thread_id=thread-201
```

Possible output:

```text
2026-03-23T18:41:02.110Z  incoming.fetch_threads  fetched 12 Gmail threads
2026-03-23T18:41:03.482Z  analyze.decision        classified thread as needs-reply
2026-03-23T18:41:04.005Z  analyze.draft_insert    inserted reply draft
2026-03-23T18:41:06.901Z  send.provider_call      Gmail API timeout
```

Example:

```bash
resq-flow logs list --flow mail-pipeline --attr stage_id=send.provider_call --json
```

Possible output:

```json
[
  {
    "timestamp": "2026-03-23T18:41:06.901Z",
    "flowId": "mail-pipeline",
    "runId": "thread-201",
    "traceId": "trace-send-201",
    "stageId": "send.provider_call",
    "componentId": "send-worker",
    "status": "error",
    "message": "Gmail API timeout",
    "attributes": {
      "thread_id": "thread-201",
      "provider": "gmail",
      "retryable": true
    }
  }
]
```

### `resq-flow logs tail`

Supported args:

- `--flow <flow-id>`
- `--attr <key=value>` repeatable
- `--query <text>`
- `--jsonl`
- `--url <base-url>`

Example:

```bash
resq-flow logs tail --flow mail-pipeline
```

Possible output:

```text
[18:45:01] incoming.fetch_threads   ok     fetched 8 Gmail threads
[18:45:02] analyze.decision         ok     classified thread as needs-reply
[18:45:03] analyze.draft_insert     ok     inserted reply draft
[18:45:05] send.provider_call       ok     sent Gmail reply
```

Example:

```bash
resq-flow logs tail --flow mail-pipeline --attr thread_id=thread-201
```

Possible output:

```text
[18:45:02] analyze.decision      thread-201  classified thread as needs-reply
[18:45:03] analyze.draft_insert  thread-201  inserted reply draft
[18:45:05] send.provider_call    thread-201  sent Gmail reply
```

Example:

```bash
resq-flow logs tail --flow mail-pipeline --jsonl
```

Possible output:

```json
{"timestamp":"2026-03-23T18:45:02.014Z","flowId":"mail-pipeline","runId":"thread-201","stageId":"analyze.decision","status":"ok","message":"classified thread as needs-reply"}
{"timestamp":"2026-03-23T18:45:03.227Z","flowId":"mail-pipeline","runId":"thread-201","stageId":"analyze.draft_insert","status":"ok","message":"inserted reply draft"}
{"timestamp":"2026-03-23T18:45:05.941Z","flowId":"mail-pipeline","runId":"thread-201","stageId":"send.provider_call","status":"ok","message":"sent Gmail reply"}
```

## Open Questions

1. Should `--flow` be strictly required in the MVP for both `logs list` and `logs tail`, or do we want to allow an all-flows mode later?
2. Should the default human-readable `logs list` output always include a run identifier column when available, or only when present in some rows?
3. Should `logs tail` print the initial matching snapshot first, then continue with live batches, or should it support a future flag to skip the snapshot?

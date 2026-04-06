# resq-flow skills

These skills help developers and agents use `resq-flow` in a consistent way.

Use this folder as the quick "which skill do I want?" index.
Use each `SKILL.md` for the full instructions.

## Skill guide

| Skill | Use when | Do not use when |
| --- | --- | --- |
| `flow-cli-create` | You are creating a brand-new flow that should show up in `resq-flow` | You are only adding or changing logs inside an existing flow |
| `flow-cli-write` | You are adding or changing flow-visible logs for an existing flow | You are scaffolding a new flow from scratch |
| `flow-cli-read` | You want to inspect logs, tail live activity, or explain why a run stopped/failed/completed | You are writing producer-side telemetry |

## Typical workflow

1. Use `flow-cli-create` to scaffold a new flow.
2. Use `flow-cli-write` to add or refine node logs and step logs.
3. Use `flow-cli-read` to validate the result with the CLI.

## Related local docs

- `../README.md`
- `../ARCHITECTURE.md`
- `../resq-flow.md`
- `../docs/shared-flow-event-contract.md`
- `../docs/adding-a-flow.md`
- `../docs/cli.md`

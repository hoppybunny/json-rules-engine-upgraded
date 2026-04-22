# Contributing

Thanks for helping to improve this codebase!

## Dev setup

```bash
git clone https://github.com/clarachong/json-rules-engine-upgraded
cd json-rules-engine-upgraded
pnpm install
pnpm test
pnpm build
```

Node 20+ and pnpm 9+ are required.

## Workflow

1. Open an issue first for anything non-trivial.
2. Fork, branch, implement, add tests.
3. Run `pnpm test:run`, `pnpm typecheck`, `pnpm build`. All must pass.
4. Add a changeset: `pnpm changeset`. Describe your change in one line.
5. Open a PR with a clear title and description.

## Design principles

See [docs/architecture.md](docs/architecture.md). In short:

- Rules are data, never code. No `eval`, no `new Function`, no `fn` escape hatches in rule JSON.
- Strict equality by default. Explicit > implicit.
- Deterministic execution. Priority + insertion-index tiebreak.
- Every error carries `ruleName`, `conditionPath`, `operator`, `factValue`.
- Zero runtime deps in core.

## Adding operators

New built-in operators need to justify themselves against the bar:

- Genuinely general-purpose
- Not trivially composable from existing operators
- Would reasonably appear in another rules engine

Otherwise, they belong in a sibling package (e.g. `json-rules-engine-upgraded-operators-temporal`) or in user code via `engine.addOperator`.

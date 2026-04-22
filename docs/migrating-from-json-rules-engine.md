# Migrating from `json-rules-engine`

This package is a spiritual successor to [`json-rules-engine`](https://www.npmjs.com/package/json-rules-engine) — the rule shape will feel familiar — but we did not promise strict API compatibility. Most rule JSON ports with minor tweaks.

## What's the same

- Rules have `name`, `priority`, `conditions`, and `event`.
- Conditions compose via `all` / `any` / `not`.
- Leaf conditions use `fact`, `operator`, and `value`.
- Operators like `equal`, `lessThan`, `greaterThan`, `in`, `contains`, `regex` exist and behave as you'd expect.
- `engine.addFact`, `engine.addRule`, `engine.run(facts)`.
- Fact resolvers receive `(params, almanac)` and can be async.

## What's different

### Equality is strict

`json-rules-engine`'s `equal` uses `==` under the hood, so `"3" == 3` returns true. Ours uses structural equality with `Object.is` for primitives. If you depend on the loose behavior, switch to `equalLoose`.

### The run result shape is cleaner

**Before:**

```ts
const { events, failureEvents, results, failureResults } = await engine.run(facts);
```

**After:**

```ts
const { passed, failed, trace, results } = await engine.run(facts);
```

`passed` and `failed` replace `events` / `failureEvents`. `trace` is new — a per-rule evaluation tree including every condition that was reached.

### Events are typed

Our `Event` type carries generics:

```ts
type FoulOutEvent = Event<'fouledOut', { message: string }>;
```

### `$schema` versioning

Rules carry a `$schema` field. Rules without one are accepted; rules with an unknown major version are rejected.

### Rules are validated at `addRule` time

Structural issues — unknown operator, invalid path, empty `all` array — throw `RuleInvalidError` when you add the rule, not when you run it.

### Richer error codes

Every error is a `RulesEngineError` with a code (`FACT_MISSING`, `OPERATOR_UNKNOWN`, `CYCLIC_FACT`, `PATH_INVALID`, …) and context. Good for structured logging and programmatic handling.

### Stricter regex

`regex` and `matchesAny` validate their patterns against a ReDoS heuristic at rule-load time. Patterns with nested unbounded quantifiers (`(a+)+`, `(a*)*`) are rejected.

### No `node:events` dependency

The engine emits events through an internal lightweight emitter, so browser bundlers don't need a `node:events` polyfill.

### Facts are deep-frozen per run

Resolvers can read runtime facts but cannot mutate them. If you had code relying on mutation as side-effect, move it into explicit state held by your application.

## Porting checklist

1. Install the new package, remove the old one.
2. Replace imports: `import { Engine } from 'json-rules-engine-upgraded'`.
3. Rename `events` → `passed`, `failureEvents` → `failed` in callers.
4. Audit rules for `equal` vs. `equalLoose`. If your rules rely on `"3" == 3` semantics, switch or refactor.
5. Add `$schema: '1.0.0'` to stored rule JSON (optional but recommended).
6. Replace `engine.on('success', ...)` style event handlers — same API, typed args.
7. Run `npx json-rules validate` over your stored rules to flush out structural issues early.

That's it. Most ports take under an hour.

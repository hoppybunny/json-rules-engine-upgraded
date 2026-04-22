# Architecture

A brief tour of the moving parts and the design decisions behind them.

## Modules

```
Engine ─┬─ Rules (validated against OperatorRegistry at add time)
        ├─ Facts (static values or async resolvers)
        ├─ OperatorRegistry (built-ins + user extensions)
        └─ on .run(facts):
             Almanac (per-run, with fact cache + cycle detection)
             → Condition evaluator (all/any/not tree, short-circuit)
             → Event emission + hooks + per-rule trace
```

- **Engine** holds rules, fact definitions, operators, and event listeners. It is stateless between runs — one `engine.run()` call produces exactly one Almanac, which lives only for that run.
- **Almanac** is the per-run fact store. It caches computed facts by name + params-shape, detects cycles in fact dependencies, and deep-freezes inputs so resolvers can't mutate shared state.
- **OperatorRegistry** maps operator names to `evaluate(factValue, conditionValue) => boolean` functions. Built-ins live in `operators/builtin.ts`; users extend via `engine.addOperator`.
- **Condition** is a discriminated union: leaf (`fact`/`operator`/`value`) or composite (`all` / `any` / `not`). The evaluator recurses, short-circuiting where possible, and records a `ConditionTrace` tree per rule.

## Core design decisions

### TypeScript-first, no legacy baggage

We did not fork any existing engine. TypeScript types are first-class; the runtime is authored in TS and compiled. Event types, traces, and condition shapes all carry full generics.

### Strict equality by default

`equal` uses deep structural comparison backed by `Object.is` for primitives (so `NaN === NaN` holds). `equalLoose` exists as an opt-in for the `==` behavior that bit users of the previous generation of rule engines.

### Rules are data, never code

There is no `fn` escape hatch in the rule JSON. Custom behavior enters through `engine.addOperator` or `engine.addFact` — registered in code, not embedded in JSON. This keeps rules serializable, portable, and safe to load from untrusted storage (combined with JSON Schema validation).

### Versioned DSL

Every rule carries a `$schema` field (optional at construction, filled in at serialization). The engine rejects rules with an unknown major version, so the DSL can evolve with clear breakage boundaries.

### Zero runtime dependencies

The core ships with no production dependencies. The event emitter is a tiny custom implementation (~40 lines) so the package runs in browsers without `node:events`. JSONPath is a deliberately limited subset (`$.a.b[0]`) — no wildcards, no filters, no recursive descent — to avoid pulling in a full JSONPath implementation.

### Deterministic execution

Rules run in priority-descending order. Ties break on insertion order. This is tested and documented, not incidental.

## Traps we designed against

- **Silent type coercion.** `"3" == 3` quietly returning true is a footgun. Our `equal` is strict; `equalLoose` is explicit.
- **Shared mutable facts.** Runtime fact objects are deep-frozen on entry to `run`, so resolvers cannot accidentally modify shared state.
- **Cross-run caching.** The Almanac lives for one run. There is no engine-level fact cache; cross-run caching is a consumer's decision, not the engine's.
- **Unbounded regex.** Regex operator values are checked against a conservative ReDoS heuristic at rule-load time.
- **Async fact cycles.** Detected in the Almanac during resolution, with a structured `CyclicFactError` that names the chain.
- **Rules-as-code.** No `eval`, no `new Function`, no function references in rule JSON. The surface area for injection is zero.
- **`node:events` in core.** Breaks browsers. We use a tiny custom emitter instead.
- **Useless errors.** Every error carries `ruleName`, `conditionPath`, `operator`, `factValue` when relevant — tested explicitly.

## Non-goals

- **Full JSONPath.** Ship a separate package if you need filters, wildcards, or descent.
- **Forward-chaining (Rete).** Different problem class; post-v1.
- **Decision tables.** Planned for a future version; not the same DSL.
- **Visual editor.** Orthogonal to the core engine; a separate project if we build one.

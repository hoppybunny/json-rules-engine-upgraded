# json-rules-engine-upgraded

A modern, TypeScript-first JSON rules engine for Node.js and browsers. Zero runtime dependencies, pure JS (no native bindings), comprehensive built-in operators, JSON-Schema-validated DSL, and an API designed for 2026 — not 2015.

```
npm install json-rules-engine-upgraded
```

> [!NOTE]
> Looking for `json-rules-engine`? This is its modern successor: strict TypeScript types, a cleaner API, 28+ built-in operators, an exported JSON Schema for the DSL, structured error codes, and active maintenance.

## Why

- **TypeScript-first.** Every public API is strongly typed, with generics where they matter. No hand-written `.d.ts` tacked on top.
- **Comprehensive out of the box.** 28+ built-in operators: comparison, collection, string, presence/type, size, numeric — enough for most rule sets with zero extra dependencies.
- **Safe by design.** No `eval`, no `new Function`. Regex operators are checked for common ReDoS patterns at rule-load time. Facts are deep-frozen per run.
- **Deterministic.** Priority + insertion-index tiebreak, documented. Same rules + same facts = same events, always.
- **Portable rule JSON.** The rule DSL has a published JSON Schema and a `$schema` version field; rules can be stored in a database, validated in CI, and shared between services.
- **Zero runtime dependencies.** `dist/index.js` weighs in around a dozen kilobytes, tree-shakeable, browser-ready.

## 60-second example

```ts
import { Engine } from 'json-rules-engine-upgraded';

const engine = new Engine([
  {
    name: 'foulOut',
    priority: 10,
    conditions: {
      all: [
        { fact: 'gameDuration', operator: 'equal', value: 40 },
        { fact: 'personalFoulCount', operator: 'greaterThanInclusive', value: 5 },
      ],
    },
    event: { type: 'fouledOut', params: { message: 'Player has fouled out' } },
  },
]);

const { passed } = await engine.run({
  gameDuration: 40,
  personalFoulCount: 6,
});

console.log(passed); // [{ type: 'fouledOut', params: { message: 'Player has fouled out' } }]
```

## Operator catalogue

| Family | Operators |
|---|---|
| Comparison | `equal`, `notEqual`, `equalLoose`, `lessThan`, `lessThanInclusive`, `greaterThan`, `greaterThanInclusive`, `between` |
| Collection | `in`, `notIn`, `contains`, `doesNotContain`, `subsetOf`, `supersetOf`, `intersectsWith` |
| String | `startsWith`, `endsWith`, `regex`, `matchesAny` |
| Presence / type | `isEmpty`, `isNotEmpty`, `isNull`, `isNotNull`, `typeOf`, `hasProperty` |
| Size | `lengthEqual`, `lengthGreaterThan`, `lengthLessThan` |
| Numeric | `approximately` |

Need more? Register a custom operator with `engine.addOperator({ name, evaluate, validateConditionValue })`.

## Features at a glance

- `all` / `any` / `not` composition, unlimited nesting, short-circuit evaluation
- Async and sync facts, per-run caching, cycle detection on rule-add
- Priority ordering with insertion-index tiebreak
- JSONPath-style `path` field on conditions (`$.user.country`)
- Fact-to-fact comparison via `{ fact: 'other' }` as a condition value
- `onSuccess` / `onFailure` hooks, `onRuleEvaluated` tracer, `success`/`failure`/`before-rule`/`before-condition`/`on-fact-missing` events
- Structured errors with full context (`ruleName`, `conditionPath`, `operator`, `factValue`, etc.)
- Round-trip JSON serialization; `$schema` version field rejects rules from unsupported major versions
- CLI: `json-rules validate rules/*.json` for CI pipelines

## Comparison

| Feature | `json-rules-engine-upgraded` | `json-rules-engine` | `json-logic-js` |
|---|---|---|---|
| TypeScript-first | ✅ | ❌ (hand-written .d.ts) | ❌ |
| Zero runtime deps | ✅ | ❌ | ✅ |
| Built-in operators | 28+ | ~11 | many (different paradigm) |
| JSON Schema for DSL | ✅ | ❌ | ❌ |
| `$schema` versioning in rules | ✅ | ❌ | ❌ |
| Strict equality by default | ✅ | ❌ (silent coercion) | varies |
| Structured error codes | ✅ | ❌ | ❌ |
| ReDoS-safe regex | ✅ (checked at load) | ❌ | n/a |
| Browser support without polyfills | ✅ | partial | ✅ |
| Actively maintained (2026) | ✅ | slowing | maintenance mode |

## Docs

- [docs/rule-dsl.md](docs/rule-dsl.md) — full DSL reference
- [docs/architecture.md](docs/architecture.md) — design decisions & traps we avoided
- [docs/migrating-from-json-rules-engine.md](docs/migrating-from-json-rules-engine.md) — migration guide
- [docs/roadmap.md](docs/roadmap.md) — what's next

## License

[MIT](LICENSE)

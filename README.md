# json-rules-engine-upgraded

A lightweight TypeScript-first JSON rules engine for Node.js and browsers — an upgrade to [json-rules-engine](https://www.npmjs.com/package/json-rules-engine).

```
npm install json-rules-engine-upgraded
```

## What it is

A JSON rules engine lets you express business logic as data. Conditions are composed in JSON, evaluated against a fact set, and emit events when they match. Rules live outside your code: stored in a database, edited without a deploy, validated against a schema before going live.

A rule looks like this:

```json
{
  "name": "grantDiscount",
  "conditions": {
    "all": [
      { "fact": "cartTotal", "operator": "greaterThan", "value": 100 },
      { "fact": "customer", "path": "$.tier", "operator": "in", "value": ["gold", "platinum"] }
    ]
  },
  "event": { "type": "applyDiscount", "params": { "percent": 15 } }
}
```

You hand the engine a set of facts (`{ cartTotal: 150, customer: { tier: "gold" } }`), and it tells you which rule events fire.

## Quick start

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

## Features

- Declarative `all` / `any` / `not` composition with unlimited nesting and short-circuit evaluation
- 28+ built-in operators across 6 families (comparison, collection, string, presence, size, numeric)
- Async fact resolution with per-run caching and cycle detection
- JSONPath field access (`$.user.address.country`) so rules operate on structured data without flattening
- Priority ordering with deterministic insertion-order tiebreaks
- Structured errors with full context (`ruleName`, `conditionPath`, `operator`, `factValue`)
- JSON Schema export for the rule DSL, plus `$schema` versioning so rules can evolve safely
- Strict equality by default; loose `==`-style matching is an explicit opt-in operator
- **Database-ready**: rules are plain JSON, ready for MongoDB, Postgres `jsonb`, DynamoDB, Firestore, Redis, or any store that holds JSON
- Safety: no `eval`, no `new Function`, ReDoS-checked regex, facts deep-frozen per run
- Zero runtime dependencies, ~35KB, runs in Node and browsers without polyfills

## Storing rules in MongoDB (or any JSON store)

Rules are plain JSON objects, so they round-trip through any JSON-capable store. Here's MongoDB:

```ts
import { MongoClient } from 'mongodb';
import { Engine, RULE_JSON_SCHEMA, fromJSON, OperatorRegistry } from 'json-rules-engine-upgraded';

const client = new MongoClient(process.env.MONGO_URL!);
const rules = client.db('myapp').collection('rules');

// 1. (Optional but recommended) Enforce rule shape at the database level
//    using Mongo's $jsonSchema validator. Any insert that doesn't match
//    the DSL schema is rejected before it hits your collection.
await client.db('myapp').command({
  collMod: 'rules',
  validator: { $jsonSchema: RULE_JSON_SCHEMA as any },
  validationLevel: 'strict',
});

// 2. Insert a rule — just a document
await rules.insertOne({
  $schema: '1.0.0',
  name: 'grantDiscount',
  conditions: {
    all: [
      { fact: 'cartTotal', operator: 'greaterThan', value: 100 },
      { fact: 'customer', path: '$.tier', operator: 'in', value: ['gold', 'platinum'] },
    ],
  },
  event: { type: 'applyDiscount', params: { percent: 15 } },
});

// 3. Load rules into the engine at startup (or on a change stream)
const engine = new Engine();
const operators = new OperatorRegistry();
for await (const doc of rules.find()) {
  engine.addRule(fromJSON(doc, { operators }));
}

// 4. Run against a fact set
const { passed } = await engine.run({
  cartTotal: 150,
  customer: { tier: 'gold' },
});
```

Because rules are JSON, you get everything Mongo already gives you for free: indexing on `name`, `event.type`, or `$schema`; querying by condition content; soft-deletes; audit trails via change streams; A/B tested rulesets via a `variant` field. No ORM, no schema migrations for rule shape changes — just bump `$schema` when you evolve the DSL.

Works the same with Postgres `jsonb`, DynamoDB, Firestore, Redis, or any store that holds JSON.

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

## Comparison

How it compares to adjacent libraries:

| Feature | `json-rules-engine-upgraded` | `json-rules-engine` | `json-logic-js` |
|---|---|---|---|
| TypeScript-first | ✅ | ❌ | ❌ |
| Zero runtime deps | ✅ | ❌ | ✅ |
| Built-in operators | 28+ | ~11 | many (different paradigm) |
| JSON Schema for DSL | ✅ | ❌ | ❌ |
| `$schema` versioning in rules | ✅ | ❌ | ❌ |
| Strict equality by default | ✅ | ❌ | varies |
| Structured error codes | ✅ | ❌ | ❌ |
| ReDoS-safe regex | ✅ (checked at load) | ❌ | n/a |
| Browser support without polyfills | ✅ | partial | ✅ |

## Related libraries

**Not a schema validator.** Libraries like [Ajv](https://ajv.js.org/json-type-definition.html) and [Zod](https://zod.dev) answer *"is this data shaped correctly?"*. This library answers *"given this data, what business rule fires?"*. They compose cleanly — use the exported `RULE_JSON_SCHEMA` with Ajv to validate rule JSON at ingest.

## Docs

- [docs/rule-dsl.md](docs/rule-dsl.md) — full DSL reference
- [docs/architecture.md](docs/architecture.md) — design decisions
- [docs/migrating-from-json-rules-engine.md](docs/migrating-from-json-rules-engine.md) — migration guide
- [docs/roadmap.md](docs/roadmap.md) — what's next

## License

[MIT](LICENSE)

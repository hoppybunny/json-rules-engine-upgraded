# json-rules-engine-upgraded

A lightweight TypeScript-first JSON rules engine for Node.js and browsers — an upgrade to [json-rules-engine](https://www.npmjs.com/package/json-rules-engine).

```
npm install json-rules-engine-upgraded
```

## Synopsis

`json-rules-engine-upgraded` is a rules engine. Rules are composed of simple JSON structures — strictly typed, schema-validated at load time, and easy to persist in any JSON store.

## Features

- Rules expressed in simple, strictly-typed JSON; human-readable and persistable
- Full support for `all` / `any` / `not` boolean operators, with recursive nesting and short-circuit evaluation
- 28+ built-in operators across 6 families (comparison, collection, string, presence, size, numeric); custom operators supported
- Async fact resolution with per-run caching and cycle detection
- TypeScript-first end-to-end; zero runtime dependencies
- JSON Schema export for the DSL, plus a `$schema` version field on every rule
- Structured errors with `ruleName`, `conditionPath`, `operator`, and `factValue` context
- Database-ready: rules drop straight into MongoDB, Postgres `jsonb`, DynamoDB, Firestore, or Redis
- Secure; no `eval()`, ReDoS-checked regex, facts deep-frozen per run
- Isomorphic; runs in Node and browsers without polyfills; ~35KB

## Basic Example

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

Register a custom operator with `engine.addOperator({ name, evaluate, validateConditionValue })`.

## Comparison

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

Not a schema validator. Libraries like [Ajv](https://ajv.js.org/json-type-definition.html) and [Zod](https://zod.dev) answer *"is this data shaped correctly?"*. This library answers *"given this data, what business rule fires?"*. They compose — use the exported `RULE_JSON_SCHEMA` with Ajv to validate rule JSON at ingest.

## Docs

- [docs/rule-dsl.md](docs/rule-dsl.md) — full DSL reference
- [docs/architecture.md](docs/architecture.md) — design decisions
- [docs/migrating-from-json-rules-engine.md](docs/migrating-from-json-rules-engine.md) — migration guide
- [docs/roadmap.md](docs/roadmap.md) — what's next

## License

[MIT](LICENSE)

# Rule DSL reference

A rule is a JSON object describing when an event should fire.

```json
{
  "$schema": "1.0.0",
  "name": "foulOut",
  "priority": 10,
  "conditions": { "all": [ { "fact": "personalFoulCount", "operator": "greaterThanInclusive", "value": 5 } ] },
  "event": { "type": "fouledOut", "params": { "message": "Player has fouled out" } }
}
```

## Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `$schema` | string | no | DSL version (`"1.0.0"` or the canonical URL). Unknown majors are rejected. Defaults to the current version on serialization. |
| `name` | string | yes | Unique within an engine. |
| `priority` | number | no | Higher runs first; ties break on insertion order. Default `0`. |
| `conditions` | Condition | yes | See below. |
| `event` | `{ type: string, params?: object }` | yes | Emitted on success. |

Code-only (not serialized):

- `onSuccess(event, almanac)` / `onFailure(event, almanac)` — async lifecycle hooks. Added to a rule object in code; stripped by `toJSON`.

## Conditions

A condition is one of four shapes:

### Leaf

```json
{
  "fact": "age",
  "operator": "greaterThanInclusive",
  "value": 21,
  "path": "$.profile.age",
  "params": { "source": "kyc" },
  "name": "age-check"
}
```

- `fact` — the name of a registered fact.
- `operator` — a built-in or custom operator name.
- `value` — a literal or a `{ fact, path?, params? }` reference to another fact (for fact-to-fact comparisons).
- `path` — optional JSONPath subset applied to the fact value (`$.user.country`, `$.items[0].price`).
- `params` — optional parameters passed to the fact resolver.
- `name` — optional label that appears in traces.

### All (logical AND)

```json
{ "all": [ { "...": "..." }, { "...": "..." } ], "name": "rootAnd", "priority": 5 }
```

Short-circuits on the first false child.

### Any (logical OR)

```json
{ "any": [ { "...": "..." }, { "...": "..." } ] }
```

Short-circuits on the first true child.

### Not (logical NOT)

```json
{ "not": { "fact": "blocked", "operator": "equal", "value": true } }
```

## Operators

See the [operator catalogue](../README.md#operator-catalogue) in the root README for the full list (28+ built-ins across comparison, collection, string, presence, size, numeric).

### Registering custom operators

```ts
engine.addOperator({
  name: 'divisibleBy',
  evaluate: (factValue, conditionValue) =>
    typeof factValue === 'number' &&
    typeof conditionValue === 'number' &&
    factValue % conditionValue === 0,
  validateConditionValue: (value) => {
    if (typeof value !== 'number' || value === 0) {
      throw new Error('divisibleBy requires a non-zero number');
    }
  },
});
```

## Facts

Register facts on the engine:

```ts
engine.addFact('age', 30);                           // static value
engine.addFact('tier', async (_params, almanac) => { // async resolver
  const account = await almanac.factValue('account');
  return account.tier;
});
```

At run time, supplemental facts can be passed directly:

```ts
await engine.run({ age: 25, country: 'US' });
```

Runtime facts override registered facts with the same name.

## Path resolution

The `path` field accepts a small JSONPath subset:

- `$` — root (identity).
- `$.a.b.c` — dot-notation into objects.
- `$.a[0]` — array index via brackets.
- `$.a.0.b` — numeric dot segments are treated as indexes.

Not supported: wildcards (`*`), descent (`..`), filters, slices.

## JSON Schema

The DSL has an exported JSON Schema:

```ts
import { RULE_JSON_SCHEMA } from 'json-rules-engine-upgraded/schema';
```

Use this with your favourite schema validator (ajv, etc.) to validate rule JSON outside this runtime.

Or, from the command line:

```
npx json-rules validate path/to/rule.json
```

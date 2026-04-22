# json-rules-engine-upgraded

A modern, TypeScript-first JSON rules engine. See the [root README](https://github.com/hoppybunny/json-rules-engine-upgraded) for the full pitch, comparison, and docs.

## Install

```
npm install json-rules-engine-upgraded
```

## Quickstart

```ts
import { Engine } from 'json-rules-engine-upgraded';

const engine = new Engine([
  {
    name: 'foulOut',
    conditions: {
      all: [
        { fact: 'gameDuration', operator: 'equal', value: 40 },
        { fact: 'personalFoulCount', operator: 'greaterThanInclusive', value: 5 },
      ],
    },
    event: { type: 'fouledOut' },
  },
]);

const result = await engine.run({ gameDuration: 40, personalFoulCount: 6 });
console.log(result.passed); // [{ type: 'fouledOut' }]
```

## CLI

Validate rule JSON files against the DSL schema:

```
npx json-rules validate path/to/rule.json
```

## License

MIT

import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';

describe('Almanac caching', () => {
  it('resolves a fact at most once per run (params-keyed)', async () => {
    let calls = 0;
    const engine = new Engine();
    engine.addFact('expensive', () => {
      calls++;
      return 42;
    });
    engine.addRule({
      name: 'r',
      conditions: {
        all: [
          { fact: 'expensive', operator: 'equal', value: 42 },
          { fact: 'expensive', operator: 'greaterThan', value: 0 },
          { fact: 'expensive', operator: 'lessThan', value: 100 },
        ],
      },
      event: { type: 'ok' },
    });
    await engine.run();
    expect(calls).toBe(1);
  });

  it('caches per params-shape — different params re-resolve', async () => {
    let calls = 0;
    const engine = new Engine();
    engine.addFact('byKey', (params) => {
      calls++;
      return (params as { k: number }).k * 10;
    });
    engine.addRule({
      name: 'r',
      conditions: {
        all: [
          { fact: 'byKey', params: { k: 1 }, operator: 'equal', value: 10 },
          { fact: 'byKey', params: { k: 2 }, operator: 'equal', value: 20 },
          { fact: 'byKey', params: { k: 1 }, operator: 'equal', value: 10 },
        ],
      },
      event: { type: 'ok' },
    });
    await engine.run();
    expect(calls).toBe(2);
  });

  it('deep-freezes runtime facts so resolvers cannot mutate them', async () => {
    const engine = new Engine();
    engine.addFact('mutator', async (_p, almanac) => {
      const obj = await almanac.factValue<{ count: number }>('inputs');
      expect(() => {
        (obj as { count: number }).count = 99;
      }).toThrow();
      return obj.count;
    });
    engine.addRule({
      name: 'r',
      conditions: { fact: 'mutator', operator: 'equal', value: 5 },
      event: { type: 'ok' },
    });
    const r = await engine.run({ inputs: { count: 5 } });
    expect(r.passed).toHaveLength(1);
  });

  it('does not share cache across runs', async () => {
    let value = 1;
    const engine = new Engine();
    engine.addFact('varies', () => value);
    engine.addRule({
      name: 'r',
      conditions: { fact: 'varies', operator: 'equal', value: { fact: 'target' } },
      event: { type: 'ok' },
    });
    expect((await engine.run({ target: 1 })).passed).toHaveLength(1);
    value = 5;
    expect((await engine.run({ target: 5 })).passed).toHaveLength(1);
  });
});

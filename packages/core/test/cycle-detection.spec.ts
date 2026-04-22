import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';
import { CyclicFactError } from '../src/errors.js';

describe('Cyclic fact dependencies', () => {
  it('throws a CyclicFactError when two facts depend on each other', async () => {
    const engine = new Engine();
    engine.addFact('a', async (_p, almanac) => almanac.factValue('b'));
    engine.addFact('b', async (_p, almanac) => almanac.factValue('a'));
    engine.addRule({
      name: 'r',
      conditions: { fact: 'a', operator: 'equal', value: 1 },
      event: { type: 'ok' },
    });
    await expect(engine.run()).rejects.toBeInstanceOf(CyclicFactError);
  });

  it('allows diamond dependencies without cycles', async () => {
    const engine = new Engine();
    engine.addFact('base', 1);
    engine.addFact('left', async (_p, a) => ((await a.factValue<number>('base')) + 1));
    engine.addFact('right', async (_p, a) => ((await a.factValue<number>('base')) + 2));
    engine.addFact('root', async (_p, a) => {
      const l = await a.factValue<number>('left');
      const r = await a.factValue<number>('right');
      return l + r;
    });
    engine.addRule({
      name: 'r',
      conditions: { fact: 'root', operator: 'equal', value: 5 },
      event: { type: 'ok' },
    });
    const r = await engine.run();
    expect(r.passed).toHaveLength(1);
  });
});

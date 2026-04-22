import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';

describe('event ordering', () => {
  it('orders rules by priority descending', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'low',
      priority: 1,
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'low' },
    });
    engine.addRule({
      name: 'high',
      priority: 10,
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'high' },
    });
    const r = await engine.run({ x: 1 });
    expect(r.passed.map((e) => e.type)).toEqual(['high', 'low']);
  });

  it('breaks priority ties by insertion order', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'first',
      priority: 5,
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'first' },
    });
    engine.addRule({
      name: 'second',
      priority: 5,
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'second' },
    });
    const r = await engine.run({ x: 1 });
    expect(r.passed.map((e) => e.type)).toEqual(['first', 'second']);
  });

  it('respects stopOnFirstEvent', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'one',
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'one' },
    });
    engine.addRule({
      name: 'two',
      conditions: { fact: 'x', operator: 'equal', value: 1 },
      event: { type: 'two' },
    });
    const r = await engine.run({ x: 1 }, { stopOnFirstEvent: true });
    expect(r.passed.map((e) => e.type)).toEqual(['one']);
  });
});

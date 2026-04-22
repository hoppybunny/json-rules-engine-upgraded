import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';

describe('condition composition', () => {
  it('evaluates `all` as AND with short-circuit', async () => {
    let secondEvaluated = false;
    const engine = new Engine();
    engine.addFact('first', false);
    engine.addFact('second', () => {
      secondEvaluated = true;
      return true;
    });
    engine.addRule({
      name: 'all',
      conditions: {
        all: [
          { fact: 'first', operator: 'equal', value: true },
          { fact: 'second', operator: 'equal', value: true },
        ],
      },
      event: { type: 'ok' },
    });
    const r = await engine.run();
    expect(r.passed).toHaveLength(0);
    expect(secondEvaluated).toBe(false);
  });

  it('evaluates `any` as OR with short-circuit', async () => {
    let secondEvaluated = false;
    const engine = new Engine();
    engine.addFact('first', true);
    engine.addFact('second', () => {
      secondEvaluated = true;
      return false;
    });
    engine.addRule({
      name: 'any',
      conditions: {
        any: [
          { fact: 'first', operator: 'equal', value: true },
          { fact: 'second', operator: 'equal', value: true },
        ],
      },
      event: { type: 'ok' },
    });
    const r = await engine.run();
    expect(r.passed).toHaveLength(1);
    expect(secondEvaluated).toBe(false);
  });

  it('evaluates `not` correctly', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'not',
      conditions: { not: { fact: 'x', operator: 'equal', value: 1 } },
      event: { type: 'ok' },
    });
    expect((await engine.run({ x: 2 })).passed).toHaveLength(1);
    expect((await engine.run({ x: 1 })).passed).toHaveLength(0);
  });

  it('supports unlimited nesting', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'nested',
      conditions: {
        all: [
          { fact: 'a', operator: 'equal', value: 1 },
          {
            any: [
              { fact: 'b', operator: 'equal', value: 2 },
              { not: { fact: 'c', operator: 'equal', value: 3 } },
            ],
          },
        ],
      },
      event: { type: 'ok' },
    });
    expect((await engine.run({ a: 1, b: 2, c: 3 })).passed).toHaveLength(1);
    expect((await engine.run({ a: 1, b: 5, c: 5 })).passed).toHaveLength(1);
    expect((await engine.run({ a: 0, b: 2, c: 3 })).passed).toHaveLength(0);
  });

  it('rejects `all` / `any` with empty arrays at load time', () => {
    const engine = new Engine();
    expect(() =>
      engine.addRule({
        name: 'empty',
        conditions: { all: [] },
        event: { type: 'ok' },
      }),
    ).toThrow();
    expect(() =>
      engine.addRule({
        name: 'empty2',
        conditions: { any: [] },
        event: { type: 'ok' },
      }),
    ).toThrow();
  });

  it('uses fact references as condition values', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'factVsFact',
      conditions: {
        fact: 'a',
        operator: 'greaterThan',
        value: { fact: 'b' },
      },
      event: { type: 'ok' },
    });
    expect((await engine.run({ a: 10, b: 5 })).passed).toHaveLength(1);
    expect((await engine.run({ a: 5, b: 10 })).passed).toHaveLength(0);
  });
});

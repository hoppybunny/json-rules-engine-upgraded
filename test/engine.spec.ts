import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';
import { DuplicateRegistrationError, RuleInvalidError } from '../src/errors.js';
import type { Rule } from '../src/types.js';

const fouledOut: Rule = {
  name: 'foulOut',
  priority: 10,
  conditions: {
    all: [
      { fact: 'gameDuration', operator: 'equal', value: 40 },
      { fact: 'personalFoulCount', operator: 'greaterThanInclusive', value: 5 },
    ],
  },
  event: { type: 'fouledOut', params: { message: 'Player has fouled out' } },
};

describe('Engine — basic orchestration', () => {
  it('evaluates rules and returns passed/failed events', async () => {
    const engine = new Engine([fouledOut]);
    const result = await engine.run({ gameDuration: 40, personalFoulCount: 6 });
    expect(result.passed).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    expect(result.passed[0]?.type).toBe('fouledOut');
  });

  it('fails the rule when conditions do not hold', async () => {
    const engine = new Engine([fouledOut]);
    const result = await engine.run({ gameDuration: 40, personalFoulCount: 3 });
    expect(result.passed).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
  });

  it('runs onSuccess and onFailure hooks', async () => {
    let successCalls = 0;
    let failureCalls = 0;
    const engine = new Engine([
      {
        ...fouledOut,
        onSuccess: async () => {
          successCalls++;
        },
        onFailure: async () => {
          failureCalls++;
        },
      },
    ]);
    await engine.run({ gameDuration: 40, personalFoulCount: 6 });
    await engine.run({ gameDuration: 40, personalFoulCount: 2 });
    expect(successCalls).toBe(1);
    expect(failureCalls).toBe(1);
  });

  it('forbids duplicate rule names', () => {
    const engine = new Engine([fouledOut]);
    expect(() => engine.addRule(fouledOut)).toThrow(DuplicateRegistrationError);
  });

  it('validates rules against the operator registry at add time', () => {
    const engine = new Engine();
    expect(() =>
      engine.addRule({
        name: 'bad',
        conditions: { fact: 'x', operator: 'mystery', value: 1 },
        event: { type: 'bad' },
      }),
    ).toThrow(RuleInvalidError);
  });

  it('supports updateRule and removeRule', () => {
    const engine = new Engine([fouledOut]);
    engine.updateRule({ ...fouledOut, priority: 99 });
    expect(engine.getRule('foulOut')?.priority).toBe(99);
    expect(engine.removeRule('foulOut')).toBe(true);
    expect(engine.hasRule('foulOut')).toBe(false);
  });

  it('supports static and async registered facts', async () => {
    const engine = new Engine();
    engine.addFact('static', 10);
    engine.addFact('derived', async (_p, almanac) => {
      const v = await almanac.factValue<number>('static');
      return v * 2;
    });
    engine.addRule({
      name: 'r',
      conditions: { fact: 'derived', operator: 'equal', value: 20 },
      event: { type: 'ok' },
    });
    const r = await engine.run();
    expect(r.passed).toHaveLength(1);
  });

  it('allows undefined facts when opted in', async () => {
    const engine = new Engine();
    engine.addRule({
      name: 'r',
      conditions: { fact: 'missing', operator: 'equal', value: null },
      event: { type: 'ok' },
    });
    const r = await engine.run({}, { allowUndefinedFacts: true });
    expect(r.passed).toHaveLength(1);
  });

  it('emits success and failure events to listeners', async () => {
    const engine = new Engine([fouledOut]);
    const events: string[] = [];
    engine.on('success', (e) => {
      events.push(`success:${e.type}`);
    });
    engine.on('failure', (e) => {
      events.push(`failure:${e.type}`);
    });
    await engine.run({ gameDuration: 40, personalFoulCount: 6 });
    await engine.run({ gameDuration: 40, personalFoulCount: 2 });
    expect(events).toEqual(['success:fouledOut', 'failure:fouledOut']);
  });

  it('invokes onRuleEvaluated per rule with trace', async () => {
    const engine = new Engine([fouledOut]);
    const traces: string[] = [];
    await engine.run({ gameDuration: 40, personalFoulCount: 6 }, {
      onRuleEvaluated: (t) => traces.push(`${t.rule}:${t.result}`),
    });
    expect(traces).toEqual(['foulOut:true']);
  });
});

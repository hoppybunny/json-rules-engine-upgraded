import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';
import { OperatorRegistry } from '../src/operators/index.js';
import { fromJSON, toJSON } from '../src/rule.js';
import { DSL_VERSION } from '../src/types.js';
import { DslVersionError, RuleInvalidError } from '../src/errors.js';
import type { Rule } from '../src/types.js';

const rule: Rule = {
  $schema: DSL_VERSION,
  name: 'over21',
  priority: 5,
  conditions: {
    all: [
      { fact: 'age', operator: 'greaterThanInclusive', value: 21 },
      { fact: 'country', operator: 'in', value: ['US', 'UK'] },
    ],
  },
  event: { type: 'grantAccess' },
};

describe('rule serialization', () => {
  it('round-trips via JSON.stringify/parse', () => {
    const json = JSON.parse(JSON.stringify(rule)) as Rule;
    const restored = fromJSON(json, { operators: new OperatorRegistry() });
    expect(restored).toEqual(rule);
  });

  it('drops non-serializable hooks in toJSON', () => {
    const withHooks: Rule = {
      ...rule,
      onSuccess: () => {},
      onFailure: () => {},
    };
    const serialized = toJSON(withHooks);
    expect('onSuccess' in serialized).toBe(false);
    expect('onFailure' in serialized).toBe(false);
  });

  it('adds $schema when missing', () => {
    const bare = { ...rule };
    delete bare.$schema;
    expect(toJSON(bare).$schema).toBe(DSL_VERSION);
  });

  it('rejects rules from a future major DSL version', () => {
    expect(() =>
      fromJSON({ ...rule, $schema: '99.0.0' }, { operators: new OperatorRegistry() }),
    ).toThrow(DslVersionError);
  });

  it('rejects invalid rule structure', () => {
    expect(() =>
      fromJSON({ name: '', conditions: {}, event: { type: 'x' } }, {
        operators: new OperatorRegistry(),
      }),
    ).toThrow(RuleInvalidError);
  });

  it('a round-tripped rule evaluates identically', async () => {
    const engine1 = new Engine([rule]);
    const engine2 = new Engine();
    const roundTripped = fromJSON(JSON.parse(JSON.stringify(rule)), {
      operators: new OperatorRegistry(),
    });
    engine2.addRule(roundTripped);
    const facts = { age: 25, country: 'US' };
    const r1 = await engine1.run(facts);
    const r2 = await engine2.run(facts);
    expect(r1.passed.map((e) => e.type)).toEqual(r2.passed.map((e) => e.type));
  });
});

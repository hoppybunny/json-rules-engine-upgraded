import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';
import {
  DuplicateRegistrationError,
  FactMissingError,
  OperatorUnknownError,
  RuleInvalidError,
  RulesEngineError,
} from '../src/errors.js';

describe('structured errors', () => {
  it('FactMissingError carries factName', () => {
    const err = new FactMissingError('missing');
    expect(err).toBeInstanceOf(RulesEngineError);
    expect(err.code).toBe('FACT_MISSING');
    expect(err.context.factName).toBe('missing');
  });

  it('OperatorUnknownError carries operator', () => {
    const err = new OperatorUnknownError('mystery');
    expect(err.code).toBe('OPERATOR_UNKNOWN');
    expect(err.context.operator).toBe('mystery');
  });

  it('DuplicateRegistrationError maps kind to specific code', () => {
    expect(new DuplicateRegistrationError('rule', 'x').code).toBe('RULE_NAME_DUPLICATE');
    expect(new DuplicateRegistrationError('fact', 'x').code).toBe('FACT_NAME_DUPLICATE');
    expect(new DuplicateRegistrationError('operator', 'x').code).toBe('OPERATOR_NAME_DUPLICATE');
  });

  it('Engine.run surfaces FactMissingError when allowUndefinedFacts is false', async () => {
    const engine = new Engine([
      {
        name: 'r',
        conditions: { fact: 'nope', operator: 'equal', value: 1 },
        event: { type: 'ok' },
      },
    ]);
    await expect(engine.run()).rejects.toBeInstanceOf(FactMissingError);
  });

  it('RuleInvalidError carries ruleName context', () => {
    try {
      new Engine().addRule({
        name: 'bad',
        conditions: { fact: 'x', operator: 'nope', value: 1 },
        event: { type: 'x' },
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RuleInvalidError);
      expect((err as RuleInvalidError).context.ruleName).toBe('bad');
      expect((err as RuleInvalidError).context.operator).toBe('nope');
    }
  });
});

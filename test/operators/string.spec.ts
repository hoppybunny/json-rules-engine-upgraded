import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';
import { OperatorValidationError } from '../../src/errors.js';

const ops = new OperatorRegistry();

describe('startsWith / endsWith', () => {
  it('checks string prefix and suffix', () => {
    expect(ops.evaluate('startsWith', 'hello world', 'hello')).toBe(true);
    expect(ops.evaluate('startsWith', 'hello world', 'world')).toBe(false);
    expect(ops.evaluate('endsWith', 'hello world', 'world')).toBe(true);
    expect(ops.evaluate('endsWith', 'hello world', 'hello')).toBe(false);
  });
});

describe('regex', () => {
  it('matches patterns', () => {
    expect(ops.evaluate('regex', 'abc123', '^abc\\d+$')).toBe(true);
    expect(ops.evaluate('regex', 'abc', '^\\d+$')).toBe(false);
  });

  it('rejects unsafe patterns at validation time', () => {
    expect(() => ops.validateConditionValue('regex', '(a+)+')).toThrow(OperatorValidationError);
    expect(() => ops.validateConditionValue('regex', '(a*)*')).toThrow(OperatorValidationError);
  });

  it('rejects overly long patterns', () => {
    const longPattern = 'a'.repeat(2000);
    expect(() => ops.validateConditionValue('regex', longPattern)).toThrow(OperatorValidationError);
  });

  it('rejects invalid regex syntax', () => {
    expect(() => ops.validateConditionValue('regex', '(unclosed')).toThrow(OperatorValidationError);
  });
});

describe('matchesAny', () => {
  it('returns true if any pattern matches', () => {
    expect(ops.evaluate('matchesAny', 'abc123', ['^\\d+$', '^[a-z]+\\d+$'])).toBe(true);
    expect(ops.evaluate('matchesAny', 'xyz', ['^\\d+$', '^[0-9]+$'])).toBe(false);
  });

  it('validates every pattern in the array', () => {
    expect(() => ops.validateConditionValue('matchesAny', ['valid', '(a+)+'])).toThrow(
      OperatorValidationError,
    );
  });
});

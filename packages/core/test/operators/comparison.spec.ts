import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';
import { OperatorValidationError } from '../../src/errors.js';

const ops = new OperatorRegistry();

describe('equal / notEqual', () => {
  it('compares primitives strictly', () => {
    expect(ops.evaluate('equal', 3, 3)).toBe(true);
    expect(ops.evaluate('equal', '3', 3)).toBe(false);
    expect(ops.evaluate('notEqual', 3, 4)).toBe(true);
  });

  it('treats NaN as equal to NaN', () => {
    expect(ops.evaluate('equal', Number.NaN, Number.NaN)).toBe(true);
  });

  it('deep-compares arrays and objects', () => {
    expect(ops.evaluate('equal', [1, 2, 3], [1, 2, 3])).toBe(true);
    expect(ops.evaluate('equal', [1, 2], [1, 2, 3])).toBe(false);
    expect(ops.evaluate('equal', { a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(ops.evaluate('equal', { a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});

describe('equalLoose', () => {
  it('applies loose coercion unlike equal', () => {
    expect(ops.evaluate('equal', '3', 3)).toBe(false);
    expect(ops.evaluate('equalLoose', '3', 3)).toBe(true);
  });
});

describe('lessThan / lessThanInclusive / greaterThan / greaterThanInclusive', () => {
  it('returns expected booleans', () => {
    expect(ops.evaluate('lessThan', 3, 5)).toBe(true);
    expect(ops.evaluate('lessThan', 5, 5)).toBe(false);
    expect(ops.evaluate('lessThanInclusive', 5, 5)).toBe(true);
    expect(ops.evaluate('greaterThan', 6, 5)).toBe(true);
    expect(ops.evaluate('greaterThan', 5, 5)).toBe(false);
    expect(ops.evaluate('greaterThanInclusive', 5, 5)).toBe(true);
  });

  it('rejects non-finite numbers', () => {
    expect(() => ops.evaluate('lessThan', Number.POSITIVE_INFINITY, 10)).toThrow(OperatorValidationError);
    expect(() => ops.evaluate('lessThan', 'x' as unknown as number, 10)).toThrow(OperatorValidationError);
  });
});

describe('between', () => {
  it('is inclusive on both ends', () => {
    expect(ops.evaluate('between', 5, [1, 10])).toBe(true);
    expect(ops.evaluate('between', 1, [1, 10])).toBe(true);
    expect(ops.evaluate('between', 10, [1, 10])).toBe(true);
    expect(ops.evaluate('between', 11, [1, 10])).toBe(false);
  });

  it('rejects malformed condition values at validation', () => {
    expect(() => ops.validateConditionValue('between', [5])).toThrow(OperatorValidationError);
    expect(() => ops.validateConditionValue('between', [10, 1])).toThrow(OperatorValidationError);
  });
});

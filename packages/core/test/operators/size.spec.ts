import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';
import { OperatorValidationError } from '../../src/errors.js';

const ops = new OperatorRegistry();

describe('lengthEqual / lengthGreaterThan / lengthLessThan', () => {
  it('measures string length', () => {
    expect(ops.evaluate('lengthEqual', 'abc', 3)).toBe(true);
    expect(ops.evaluate('lengthGreaterThan', 'abc', 2)).toBe(true);
    expect(ops.evaluate('lengthLessThan', 'abc', 4)).toBe(true);
  });

  it('measures array length', () => {
    expect(ops.evaluate('lengthEqual', [1, 2, 3], 3)).toBe(true);
    expect(ops.evaluate('lengthGreaterThan', [1, 2, 3], 2)).toBe(true);
    expect(ops.evaluate('lengthLessThan', [1, 2, 3], 4)).toBe(true);
  });

  it('measures object key count', () => {
    expect(ops.evaluate('lengthEqual', { a: 1, b: 2 }, 2)).toBe(true);
    expect(ops.evaluate('lengthGreaterThan', { a: 1, b: 2 }, 1)).toBe(true);
    expect(ops.evaluate('lengthLessThan', { a: 1, b: 2 }, 3)).toBe(true);
  });

  it('throws on unsupported types', () => {
    expect(() => ops.evaluate('lengthEqual', 5, 1)).toThrow(OperatorValidationError);
    expect(() => ops.evaluate('lengthEqual', true, 1)).toThrow(OperatorValidationError);
  });
});

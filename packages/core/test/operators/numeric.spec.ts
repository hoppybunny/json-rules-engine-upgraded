import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';
import { OperatorValidationError } from '../../src/errors.js';

const ops = new OperatorRegistry();

describe('approximately', () => {
  it('accepts a bare number (default epsilon ~1e-9)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — differs from 0.3 by ~4e-17, well within default epsilon
    expect(ops.evaluate('approximately', 0.1 + 0.2, 0.3)).toBe(true);
    expect(ops.evaluate('approximately', 3, 3)).toBe(true);
    // Clearly outside default 1e-9 tolerance
    expect(ops.evaluate('approximately', 1.000001, 1)).toBe(false);
  });

  it('accepts [target, epsilon] form', () => {
    expect(ops.evaluate('approximately', 0.1 + 0.2, [0.3, 1e-6])).toBe(true);
    expect(ops.evaluate('approximately', 5, [3, 1])).toBe(false);
    expect(ops.evaluate('approximately', 3.5, [3, 1])).toBe(true);
  });

  it('rejects malformed condition values', () => {
    expect(() => ops.validateConditionValue('approximately', [3])).toThrow(OperatorValidationError);
    expect(() => ops.validateConditionValue('approximately', [3, -1])).toThrow(
      OperatorValidationError,
    );
    expect(() => ops.validateConditionValue('approximately', 'x')).toThrow(OperatorValidationError);
  });
});

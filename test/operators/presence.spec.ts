import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';
import { OperatorValidationError } from '../../src/errors.js';

const ops = new OperatorRegistry();

describe('isEmpty / isNotEmpty', () => {
  it('identifies empty values across types', () => {
    expect(ops.evaluate('isEmpty', '', true)).toBe(true);
    expect(ops.evaluate('isEmpty', [], true)).toBe(true);
    expect(ops.evaluate('isEmpty', {}, true)).toBe(true);
    expect(ops.evaluate('isEmpty', null, true)).toBe(true);
    expect(ops.evaluate('isEmpty', 'hi', true)).toBe(false);
    expect(ops.evaluate('isEmpty', [1], true)).toBe(false);
    expect(ops.evaluate('isNotEmpty', 'hi', true)).toBe(true);
  });
});

describe('isNull / isNotNull', () => {
  it('distinguishes null from undefined-via-missing-fact and other falsy', () => {
    expect(ops.evaluate('isNull', null, true)).toBe(true);
    expect(ops.evaluate('isNull', 0, true)).toBe(false);
    expect(ops.evaluate('isNull', '', true)).toBe(false);
    expect(ops.evaluate('isNotNull', null, true)).toBe(false);
    expect(ops.evaluate('isNotNull', 0, true)).toBe(true);
  });
});

describe('typeOf', () => {
  it('handles arrays and null as distinct from object', () => {
    expect(ops.evaluate('typeOf', 'hi', 'string')).toBe(true);
    expect(ops.evaluate('typeOf', 1, 'number')).toBe(true);
    expect(ops.evaluate('typeOf', true, 'boolean')).toBe(true);
    expect(ops.evaluate('typeOf', [1, 2], 'array')).toBe(true);
    expect(ops.evaluate('typeOf', [1, 2], 'object')).toBe(false);
    expect(ops.evaluate('typeOf', {}, 'object')).toBe(true);
    expect(ops.evaluate('typeOf', null, 'null')).toBe(true);
    expect(ops.evaluate('typeOf', null, 'object')).toBe(false);
  });

  it('rejects unknown type names', () => {
    expect(() => ops.validateConditionValue('typeOf', 'function')).toThrow(OperatorValidationError);
  });
});

describe('hasProperty', () => {
  it('checks for own properties only', () => {
    expect(ops.evaluate('hasProperty', { a: 1 }, 'a')).toBe(true);
    expect(ops.evaluate('hasProperty', { a: 1 }, 'b')).toBe(false);
    expect(ops.evaluate('hasProperty', [], 'length')).toBe(false);
    expect(ops.evaluate('hasProperty', null, 'a')).toBe(false);
  });
});

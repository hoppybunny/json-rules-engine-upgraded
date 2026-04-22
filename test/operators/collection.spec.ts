import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from '../../src/operators/index.js';

const ops = new OperatorRegistry();

describe('in / notIn', () => {
  it('checks membership in a provided array', () => {
    expect(ops.evaluate('in', 'blue', ['red', 'green', 'blue'])).toBe(true);
    expect(ops.evaluate('in', 'yellow', ['red', 'green', 'blue'])).toBe(false);
    expect(ops.evaluate('notIn', 'yellow', ['red', 'green', 'blue'])).toBe(true);
  });

  it('deep-compares elements', () => {
    expect(ops.evaluate('in', { a: 1 }, [{ b: 2 }, { a: 1 }])).toBe(true);
  });
});

describe('contains / doesNotContain', () => {
  it('checks whether a fact-array contains the condition value', () => {
    expect(ops.evaluate('contains', ['apple', 'banana'], 'banana')).toBe(true);
    expect(ops.evaluate('contains', ['apple', 'banana'], 'cherry')).toBe(false);
    expect(ops.evaluate('doesNotContain', ['apple', 'banana'], 'cherry')).toBe(true);
  });
});

describe('subsetOf / supersetOf / intersectsWith', () => {
  it('computes set relations structurally', () => {
    expect(ops.evaluate('subsetOf', ['a', 'b'], ['a', 'b', 'c'])).toBe(true);
    expect(ops.evaluate('subsetOf', ['a', 'd'], ['a', 'b', 'c'])).toBe(false);
    expect(ops.evaluate('supersetOf', ['a', 'b', 'c'], ['a', 'b'])).toBe(true);
    expect(ops.evaluate('intersectsWith', ['a', 'b'], ['b', 'c'])).toBe(true);
    expect(ops.evaluate('intersectsWith', ['a', 'b'], ['c', 'd'])).toBe(false);
  });

  it('treats identical objects as the same set element', () => {
    expect(
      ops.evaluate('subsetOf', [{ id: 1 }], [{ id: 1 }, { id: 2 }]),
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { parsePath, resolvePath } from '../src/path.js';
import { PathInvalidError } from '../src/errors.js';

describe('parsePath', () => {
  it('handles $ prefix as identity', () => {
    expect(parsePath('$')).toEqual([]);
    expect(parsePath('')).toEqual([]);
  });

  it('handles dot notation', () => {
    expect(parsePath('$.a.b.c')).toEqual([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    expect(parsePath('a.b.c')).toEqual([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
  });

  it('handles bracket indexes', () => {
    expect(parsePath('$.a[0].b')).toEqual([{ key: 'a' }, { key: 0 }, { key: 'b' }]);
    expect(parsePath('$.a[1][2]')).toEqual([{ key: 'a' }, { key: 1 }, { key: 2 }]);
  });

  it('treats purely-numeric dot segments as indexes', () => {
    expect(parsePath('$.a.0.b')).toEqual([{ key: 'a' }, { key: 0 }, { key: 'b' }]);
  });

  it('rejects malformed input', () => {
    expect(() => parsePath('$[')).toThrow(PathInvalidError);
  });
});

describe('resolvePath', () => {
  const data = { a: { b: [{ c: 42 }, { c: 99 }], d: 'hi' }, e: null };

  it('resolves nested paths', () => {
    expect(resolvePath(data, '$.a.b[0].c')).toBe(42);
    expect(resolvePath(data, '$.a.b[1].c')).toBe(99);
    expect(resolvePath(data, '$.a.d')).toBe('hi');
  });

  it('returns undefined for missing paths', () => {
    expect(resolvePath(data, '$.a.missing')).toBeUndefined();
    expect(resolvePath(data, '$.e.child')).toBeUndefined();
    expect(resolvePath(data, '$.a.b[99].c')).toBeUndefined();
  });

  it('returns the root when path is empty or $', () => {
    expect(resolvePath(data, '$')).toEqual(data);
    expect(resolvePath(data, '')).toEqual(data);
  });
});

import { OperatorValidationError } from '../errors.js';
import type { JsonValue, OperatorDefinition } from '../types.js';

/** Deep equality for JSON-compatible values. Uses Object.is for primitives
 *  (so NaN equals NaN) and structural comparison for arrays and plain objects. */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i]!, b[i]!)) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(b)) {
    const ao = a as { [k: string]: JsonValue };
    const bo = b as { [k: string]: JsonValue };
    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.hasOwn(bo, k)) return false;
      if (!deepEqual(ao[k]!, bo[k]!)) return false;
    }
    return true;
  }
  return false;
}

function isNumber(v: JsonValue): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isString(v: JsonValue): v is string {
  return typeof v === 'string';
}

function isArray(v: JsonValue): v is JsonValue[] {
  return Array.isArray(v);
}

function isPlainObject(v: JsonValue): v is { [k: string]: JsonValue } {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function requireNumber(op: string, value: JsonValue): number {
  if (!isNumber(value)) {
    throw new OperatorValidationError(op, `expected finite number, got ${typeof value}`);
  }
  return value;
}

function requireString(op: string, value: JsonValue): string {
  if (!isString(value)) {
    throw new OperatorValidationError(op, `expected string, got ${typeof value}`);
  }
  return value;
}

function requireArray(op: string, value: JsonValue): JsonValue[] {
  if (!isArray(value)) {
    throw new OperatorValidationError(op, `expected array, got ${typeof value}`);
  }
  return value;
}

/** Conservative ReDoS-safety check. Rejects patterns exceeding a length cap
 *  and common nested unbounded quantifier constructs like (X+)+, (X*)*.
 *  Not foolproof; users needing exotic patterns should register a custom
 *  operator and accept the risk. */
export function assertSafeRegex(pattern: string, maxLen = 1000): void {
  if (pattern.length > maxLen) {
    throw new OperatorValidationError('regex', `pattern exceeds ${maxLen} chars`);
  }
  const nestedQuantifier = /\((?:[^()\\]|\\.)*[+*]\??\)[+*]/;
  if (nestedQuantifier.test(pattern)) {
    throw new OperatorValidationError(
      'regex',
      'nested unbounded quantifiers disallowed (ReDoS risk)',
    );
  }
  try {
    new RegExp(pattern);
  } catch (err) {
    throw new OperatorValidationError('regex', `invalid regex: ${(err as Error).message}`);
  }
}

function setOf(arr: JsonValue[]): Set<string> {
  return new Set(arr.map((v) => JSON.stringify(v)));
}

export const builtInOperators: readonly OperatorDefinition[] = Object.freeze([
  // --- Comparison ---
  {
    name: 'equal',
    evaluate: (f, c) => deepEqual(f, c),
  },
  {
    name: 'notEqual',
    evaluate: (f, c) => !deepEqual(f, c),
  },
  {
    name: 'equalLoose',
    // eslint-disable-next-line eqeqeq
    evaluate: (f, c) => (f as unknown) == (c as unknown),
  },
  {
    name: 'lessThan',
    evaluate: (f, c) => requireNumber('lessThan', f) < requireNumber('lessThan', c),
  },
  {
    name: 'lessThanInclusive',
    evaluate: (f, c) =>
      requireNumber('lessThanInclusive', f) <= requireNumber('lessThanInclusive', c),
  },
  {
    name: 'greaterThan',
    evaluate: (f, c) => requireNumber('greaterThan', f) > requireNumber('greaterThan', c),
  },
  {
    name: 'greaterThanInclusive',
    evaluate: (f, c) =>
      requireNumber('greaterThanInclusive', f) >= requireNumber('greaterThanInclusive', c),
  },
  {
    name: 'between',
    validateConditionValue: (v) => {
      if (!isArray(v) || v.length !== 2 || !isNumber(v[0]!) || !isNumber(v[1]!)) {
        throw new OperatorValidationError('between', 'condition value must be [min, max]');
      }
      if ((v[0] as number) > (v[1] as number)) {
        throw new OperatorValidationError('between', 'min must not exceed max');
      }
    },
    evaluate: (f, c) => {
      const n = requireNumber('between', f);
      const [min, max] = c as [number, number];
      return n >= min && n <= max;
    },
  },

  // --- Collection / membership ---
  {
    name: 'in',
    validateConditionValue: (v) => {
      if (!isArray(v)) throw new OperatorValidationError('in', 'condition value must be array');
    },
    evaluate: (f, c) => (c as JsonValue[]).some((el) => deepEqual(el, f)),
  },
  {
    name: 'notIn',
    validateConditionValue: (v) => {
      if (!isArray(v)) throw new OperatorValidationError('notIn', 'condition value must be array');
    },
    evaluate: (f, c) => !(c as JsonValue[]).some((el) => deepEqual(el, f)),
  },
  {
    name: 'contains',
    evaluate: (f, c) => {
      const arr = requireArray('contains', f);
      return arr.some((el) => deepEqual(el, c));
    },
  },
  {
    name: 'doesNotContain',
    evaluate: (f, c) => {
      const arr = requireArray('doesNotContain', f);
      return !arr.some((el) => deepEqual(el, c));
    },
  },
  {
    name: 'subsetOf',
    evaluate: (f, c) => {
      const a = requireArray('subsetOf', f);
      const b = requireArray('subsetOf', c);
      const bs = setOf(b);
      return a.every((el) => bs.has(JSON.stringify(el)));
    },
  },
  {
    name: 'supersetOf',
    evaluate: (f, c) => {
      const a = requireArray('supersetOf', f);
      const b = requireArray('supersetOf', c);
      const as_ = setOf(a);
      return b.every((el) => as_.has(JSON.stringify(el)));
    },
  },
  {
    name: 'intersectsWith',
    evaluate: (f, c) => {
      const a = requireArray('intersectsWith', f);
      const b = requireArray('intersectsWith', c);
      const bs = setOf(b);
      return a.some((el) => bs.has(JSON.stringify(el)));
    },
  },

  // --- String ---
  {
    name: 'startsWith',
    evaluate: (f, c) => requireString('startsWith', f).startsWith(requireString('startsWith', c)),
  },
  {
    name: 'endsWith',
    evaluate: (f, c) => requireString('endsWith', f).endsWith(requireString('endsWith', c)),
  },
  {
    name: 'regex',
    validateConditionValue: (v) => {
      const s = requireString('regex', v);
      assertSafeRegex(s);
    },
    evaluate: (f, c) => {
      const s = requireString('regex', f);
      return new RegExp(c as string).test(s);
    },
  },
  {
    name: 'matchesAny',
    validateConditionValue: (v) => {
      if (!isArray(v)) {
        throw new OperatorValidationError('matchesAny', 'condition value must be array of patterns');
      }
      for (const p of v) assertSafeRegex(requireString('matchesAny', p));
    },
    evaluate: (f, c) => {
      const s = requireString('matchesAny', f);
      return (c as string[]).some((p) => new RegExp(p).test(s));
    },
  },

  // --- Presence / type ---
  {
    name: 'isEmpty',
    // Condition value is ignored; convention: pass true.
    evaluate: (f) => {
      if (f == null) return true;
      if (isString(f)) return f.length === 0;
      if (isArray(f)) return f.length === 0;
      if (isPlainObject(f)) return Object.keys(f).length === 0;
      return false;
    },
  },
  {
    name: 'isNotEmpty',
    evaluate: (f) => {
      if (f == null) return false;
      if (isString(f)) return f.length > 0;
      if (isArray(f)) return f.length > 0;
      if (isPlainObject(f)) return Object.keys(f).length > 0;
      return true;
    },
  },
  {
    name: 'isNull',
    evaluate: (f) => f === null,
  },
  {
    name: 'isNotNull',
    evaluate: (f) => f !== null,
  },
  {
    name: 'typeOf',
    validateConditionValue: (v) => {
      const s = requireString('typeOf', v);
      const allowed = ['string', 'number', 'boolean', 'array', 'object', 'null'];
      if (!allowed.includes(s)) {
        throw new OperatorValidationError('typeOf', `must be one of ${allowed.join(', ')}`);
      }
    },
    evaluate: (f, c) => {
      const expected = c as string;
      if (expected === 'null') return f === null;
      if (expected === 'array') return Array.isArray(f);
      if (expected === 'object') return isPlainObject(f);
      return typeof f === expected;
    },
  },
  {
    name: 'hasProperty',
    evaluate: (f, c) => {
      const key = requireString('hasProperty', c);
      if (!isPlainObject(f)) return false;
      return Object.hasOwn(f, key);
    },
  },

  // --- Collection size ---
  {
    name: 'lengthEqual',
    evaluate: (f, c) => {
      const n = requireNumber('lengthEqual', c);
      if (isString(f) || isArray(f)) return f.length === n;
      if (isPlainObject(f)) return Object.keys(f).length === n;
      throw new OperatorValidationError('lengthEqual', 'fact must be string, array, or object');
    },
  },
  {
    name: 'lengthGreaterThan',
    evaluate: (f, c) => {
      const n = requireNumber('lengthGreaterThan', c);
      if (isString(f) || isArray(f)) return f.length > n;
      if (isPlainObject(f)) return Object.keys(f).length > n;
      throw new OperatorValidationError(
        'lengthGreaterThan',
        'fact must be string, array, or object',
      );
    },
  },
  {
    name: 'lengthLessThan',
    evaluate: (f, c) => {
      const n = requireNumber('lengthLessThan', c);
      if (isString(f) || isArray(f)) return f.length < n;
      if (isPlainObject(f)) return Object.keys(f).length < n;
      throw new OperatorValidationError('lengthLessThan', 'fact must be string, array, or object');
    },
  },

  // --- Numeric ---
  {
    name: 'approximately',
    validateConditionValue: (v) => {
      if (isNumber(v)) return;
      if (
        isArray(v) &&
        v.length === 2 &&
        isNumber(v[0]!) &&
        isNumber(v[1]!) &&
        (v[1] as number) >= 0
      ) {
        return;
      }
      throw new OperatorValidationError(
        'approximately',
        'condition value must be number or [target, epsilon]',
      );
    },
    evaluate: (f, c) => {
      const n = requireNumber('approximately', f);
      const [target, epsilon] = isArray(c) ? (c as [number, number]) : [c as number, 1e-9];
      return Math.abs(n - target) <= epsilon;
    },
  },
]);

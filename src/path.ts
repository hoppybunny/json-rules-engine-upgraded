import { PathInvalidError } from './errors.js';
import type { JsonValue } from './types.js';

/**
 * A deliberately small JSONPath subset. Supported:
 *   $.a.b.c
 *   $.a[0].b
 *   $.a.0.b       (numeric key via dot also works for arrays)
 *   a.b.c         (leading $ optional)
 *   $             (identity)
 *
 * Not supported: wildcards (*), descent (..), filters ([?(...)]), slices,
 * bracket-string keys. These belong in a separate package, not in core.
 *
 * Throws PathInvalidError for malformed input. Returns undefined for any
 * missing segment along the path.
 */

export interface ParsedPathSegment {
  key: string | number;
}

const BRACKET_INDEX = /^\[(\d+)\]/;
const DOT_SEGMENT = /^\.?([^.[\]]+)/;

export function parsePath(path: string): ParsedPathSegment[] {
  if (typeof path !== 'string') {
    throw new PathInvalidError(String(path));
  }
  let rest = path.trim();
  if (rest === '' || rest === '$') return [];
  if (rest.startsWith('$')) rest = rest.slice(1);
  if (rest.startsWith('.')) rest = rest.slice(1);

  const segments: ParsedPathSegment[] = [];
  while (rest.length > 0) {
    const bracket = BRACKET_INDEX.exec(rest);
    if (bracket) {
      segments.push({ key: Number.parseInt(bracket[1]!, 10) });
      rest = rest.slice(bracket[0].length);
      if (rest.startsWith('.')) rest = rest.slice(1);
      continue;
    }
    const dot = DOT_SEGMENT.exec(rest);
    if (!dot) {
      throw new PathInvalidError(path);
    }
    const seg = dot[1]!;
    const asNumber = Number(seg);
    segments.push({ key: Number.isInteger(asNumber) && seg !== '' ? asNumber : seg });
    rest = rest.slice(dot[0].length);
    if (rest.startsWith('.')) rest = rest.slice(1);
  }
  return segments;
}

export function resolvePath(value: JsonValue | undefined, path: string): JsonValue | undefined {
  const segments = parsePath(path);
  let cursor: JsonValue | undefined = value;
  for (const { key } of segments) {
    if (cursor == null) return undefined;
    if (typeof key === 'number') {
      if (!Array.isArray(cursor)) return undefined;
      cursor = cursor[key];
    } else {
      if (typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
      cursor = (cursor as { [k: string]: JsonValue })[key];
    }
  }
  return cursor;
}

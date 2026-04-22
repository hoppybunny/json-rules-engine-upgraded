import { CyclicFactError, FactMissingError } from './errors.js';
import { resolvePath } from './path.js';
import type { Almanac, FactDefinition, FactStore, JsonValue } from './types.js';

interface AlmanacOptions {
  allowUndefinedFacts?: boolean;
  onFactMissing?: (name: string) => void | Promise<void>;
}

interface CacheKey {
  readonly name: string;
  readonly paramsKey: string;
}

function paramsKey(params: Record<string, JsonValue> | undefined): string {
  if (!params || Object.keys(params).length === 0) return '';
  const sorted: Record<string, JsonValue> = {};
  for (const k of Object.keys(params).sort()) sorted[k] = params[k]!;
  return JSON.stringify(sorted);
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const k of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[k]);
  }
  return value;
}

/**
 * The Almanac is the per-run fact store. It resolves facts lazily, caches
 * results within a run, and detects cycles in fact dependencies.
 *
 * One Almanac per engine.run() call — never shared across runs. Runtime
 * facts are deep-frozen on insertion so resolvers can't accidentally mutate
 * shared state across evaluations.
 */
export class AlmanacImpl implements Almanac {
  readonly #definitions: ReadonlyMap<string, FactDefinition>;
  readonly #runtime: Map<string, JsonValue> = new Map();
  readonly #cache = new Map<string, Promise<JsonValue>>();
  readonly #resolving = new Set<string>();
  readonly #resolveStack: string[] = [];
  readonly #opts: AlmanacOptions;

  constructor(
    definitions: ReadonlyMap<string, FactDefinition>,
    runtimeFacts: FactStore,
    opts: AlmanacOptions = {},
  ) {
    this.#definitions = definitions;
    this.#opts = opts;
    for (const [k, v] of Object.entries(runtimeFacts)) {
      this.#runtime.set(k, deepFreeze(v) as JsonValue);
    }
  }

  addRuntimeFact(name: string, value: JsonValue): void {
    this.#runtime.set(name, deepFreeze(value) as JsonValue);
    for (const key of [...this.#cache.keys()]) {
      if (key.startsWith(`${name}|`)) this.#cache.delete(key);
    }
  }

  async factValue<T extends JsonValue = JsonValue>(
    name: string,
    params?: Record<string, JsonValue>,
    path?: string,
  ): Promise<T> {
    const key = `${name}|${paramsKey(params)}`;
    const cached = this.#cache.get(key);
    let raw: JsonValue;
    if (cached) {
      raw = await cached;
    } else {
      const pending = this.#resolve(name, params);
      this.#cache.set(key, pending);
      raw = await pending;
    }
    if (path) return resolvePath(raw, path) as T;
    return raw as T;
  }

  async getFactValues(): Promise<Record<string, JsonValue>> {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of this.#runtime) out[k] = v;
    for (const [k, def] of this.#definitions) {
      if (def.value !== undefined && !(k in out)) out[k] = def.value;
    }
    return out;
  }

  async #resolve(name: string, params?: Record<string, JsonValue>): Promise<JsonValue> {
    if (this.#runtime.has(name)) return this.#runtime.get(name)!;

    const def = this.#definitions.get(name);
    if (!def) {
      if (this.#opts.onFactMissing) await this.#opts.onFactMissing(name);
      if (this.#opts.allowUndefinedFacts) return null;
      throw new FactMissingError(name);
    }

    if (def.value !== undefined) return def.value;
    if (!def.resolver) {
      if (this.#opts.allowUndefinedFacts) return null;
      throw new FactMissingError(name);
    }

    if (this.#resolving.has(name)) {
      throw new CyclicFactError(name, [...this.#resolveStack]);
    }
    this.#resolving.add(name);
    this.#resolveStack.push(name);
    try {
      const result = await def.resolver(params, this);
      return result ?? null;
    } finally {
      this.#resolving.delete(name);
      this.#resolveStack.pop();
    }
  }
}

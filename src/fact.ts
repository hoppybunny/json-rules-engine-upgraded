import type { FactDefinition, FactReference, FactResolver, JsonValue } from './types.js';

/** Construct a static FactDefinition. */
export function staticFact(name: string, value: JsonValue): FactDefinition {
  return { id: name, value, cache: true };
}

/** Construct a dynamic FactDefinition backed by a resolver function. */
export function dynamicFact(
  name: string,
  resolver: FactResolver,
  options: { cache?: boolean } = {},
): FactDefinition {
  return { id: name, resolver, cache: options.cache ?? true };
}

/** Build a FactReference suitable for a condition's `value` field — used to
 *  compare two dynamic values (fact vs. fact) rather than fact vs. literal. */
export function factRef(
  name: string,
  options: { path?: string; params?: Record<string, JsonValue> } = {},
): FactReference {
  return {
    fact: name,
    ...(options.path !== undefined ? { path: options.path } : {}),
    ...(options.params !== undefined ? { params: options.params } : {}),
  };
}

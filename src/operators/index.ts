import { DuplicateRegistrationError, OperatorUnknownError } from '../errors.js';
import type { JsonValue, OperatorDefinition } from '../types.js';
import { builtInOperators } from './builtin.js';

export class OperatorRegistry {
  readonly #operators = new Map<string, OperatorDefinition>();

  constructor(initial: readonly OperatorDefinition[] = builtInOperators) {
    for (const op of initial) this.register(op);
  }

  register(op: OperatorDefinition): void {
    if (this.#operators.has(op.name)) {
      throw new DuplicateRegistrationError('operator', op.name);
    }
    this.#operators.set(op.name, op);
  }

  replace(op: OperatorDefinition): void {
    this.#operators.set(op.name, op);
  }

  unregister(name: string): boolean {
    return this.#operators.delete(name);
  }

  has(name: string): boolean {
    return this.#operators.has(name);
  }

  get(name: string): OperatorDefinition {
    const op = this.#operators.get(name);
    if (!op) throw new OperatorUnknownError(name);
    return op;
  }

  list(): readonly string[] {
    return [...this.#operators.keys()];
  }

  evaluate(name: string, factValue: JsonValue, conditionValue: JsonValue): boolean {
    return this.get(name).evaluate(factValue, conditionValue);
  }

  validateConditionValue(name: string, value: JsonValue): void {
    this.get(name).validateConditionValue?.(value);
  }
}

export { builtInOperators } from './builtin.js';

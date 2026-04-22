import { AlmanacImpl } from './almanac.js';
import { evaluateCondition } from './condition.js';
import {
  DuplicateRegistrationError,
  RuleInvalidError,
} from './errors.js';
import { TinyEmitter } from './event.js';
import { OperatorRegistry } from './operators/index.js';
import { validateRule } from './rule.js';
import type {
  Event,
  EngineEventMap,
  EngineOptions,
  FactDefinition,
  FactResolver,
  FactStore,
  JsonValue,
  OperatorDefinition,
  Rule,
  RuleResult,
  RuleTrace,
  RunOptions,
  RunResult,
} from './types.js';

interface StoredRule {
  rule: Rule;
  insertionIndex: number;
}

/**
 * The Engine orchestrates rule evaluation. Register rules, facts, and
 * operators up front; call `run(facts, opts)` with the runtime fact store
 * to evaluate. Event emission, tracing, and hook invocation all happen
 * inside `run` — the engine itself is stateless between runs.
 */
export class Engine<TFacts extends FactStore = FactStore> {
  readonly #rules = new Map<string, StoredRule>();
  readonly #facts = new Map<string, FactDefinition>();
  readonly #operators: OperatorRegistry;
  readonly #emitter = new TinyEmitter<EngineEventMap>();
  readonly #options: EngineOptions;
  #insertionCounter = 0;

  constructor(rules: readonly Rule[] = [], options: EngineOptions = {}) {
    this.#operators = new OperatorRegistry();
    this.#options = options;
    for (const rule of rules) this.addRule(rule);
  }

  addRule<TEvent extends Event>(rule: Rule<TEvent>): this {
    if (this.#rules.has(rule.name)) {
      throw new DuplicateRegistrationError('rule', rule.name);
    }
    validateRule(rule as unknown as Rule, { operators: this.#operators });
    this.#rules.set(rule.name, {
      rule: rule as unknown as Rule,
      insertionIndex: this.#insertionCounter++,
    });
    return this;
  }

  updateRule<TEvent extends Event>(rule: Rule<TEvent>): this {
    if (!this.#rules.has(rule.name)) {
      throw new RuleInvalidError(`cannot update: no rule named "${rule.name}"`, {
        ruleName: rule.name,
      });
    }
    validateRule(rule as unknown as Rule, { operators: this.#operators });
    const existing = this.#rules.get(rule.name)!;
    this.#rules.set(rule.name, {
      rule: rule as unknown as Rule,
      insertionIndex: existing.insertionIndex,
    });
    return this;
  }

  removeRule(name: string): boolean {
    return this.#rules.delete(name);
  }

  hasRule(name: string): boolean {
    return this.#rules.has(name);
  }

  getRule(name: string): Rule | undefined {
    return this.#rules.get(name)?.rule;
  }

  listRules(): readonly string[] {
    return [...this.#rules.keys()];
  }

  addFact(name: string, value: JsonValue, options?: { cache?: boolean }): this;
  addFact(name: string, resolver: FactResolver, options?: { cache?: boolean }): this;
  addFact(
    name: string,
    valueOrResolver: JsonValue | FactResolver,
    options: { cache?: boolean } = {},
  ): this {
    if (this.#facts.has(name)) {
      throw new DuplicateRegistrationError('fact', name);
    }
    const def: FactDefinition =
      typeof valueOrResolver === 'function'
        ? { id: name, resolver: valueOrResolver as FactResolver, cache: options.cache ?? true }
        : { id: name, value: valueOrResolver, cache: options.cache ?? true };
    this.#facts.set(name, def);
    return this;
  }

  removeFact(name: string): boolean {
    return this.#facts.delete(name);
  }

  hasFact(name: string): boolean {
    return this.#facts.has(name);
  }

  addOperator(operator: OperatorDefinition): this {
    this.#operators.register(operator);
    return this;
  }

  removeOperator(name: string): boolean {
    return this.#operators.unregister(name);
  }

  hasOperator(name: string): boolean {
    return this.#operators.has(name);
  }

  listOperators(): readonly string[] {
    return this.#operators.list();
  }

  on<K extends keyof EngineEventMap>(event: K, listener: EngineEventMap[K]): this {
    this.#emitter.on(event, listener);
    return this;
  }

  off<K extends keyof EngineEventMap>(event: K, listener: EngineEventMap[K]): this {
    this.#emitter.off(event, listener);
    return this;
  }

  async run(runtimeFacts: TFacts = {} as TFacts, options: RunOptions = {}): Promise<RunResult> {
    const allowUndefinedFacts = options.allowUndefinedFacts ?? this.#options.allowUndefinedFacts ?? false;
    const onRuleEvaluated = options.onRuleEvaluated ?? this.#options.onRuleEvaluated;

    let almanac!: AlmanacImpl;
    almanac = new AlmanacImpl(this.#facts, runtimeFacts, {
      allowUndefinedFacts,
      onFactMissing: (name) => this.#emitter.emitAsync('on-fact-missing', name, almanac),
    });

    const ordered = [...this.#rules.values()].sort((a, b) => {
      const ap = a.rule.priority ?? 0;
      const bp = b.rule.priority ?? 0;
      if (ap !== bp) return bp - ap;
      return a.insertionIndex - b.insertionIndex;
    });

    const passed: Event[] = [];
    const failed: Event[] = [];
    const traces: RuleTrace[] = [];
    const results: RuleResult<Event>[] = [];

    for (const { rule } of ordered) {
      await this.#emitter.emitAsync('before-rule', rule.name, almanac);
      const start = performance.now();
      const evalResult = await evaluateCondition(rule.conditions, {
        ruleName: rule.name,
        almanac,
        operators: this.#operators,
        path: '',
      });
      const durationMs = performance.now() - start;

      const trace: RuleTrace = {
        rule: rule.name,
        priority: rule.priority ?? 0,
        result: evalResult.result,
        event: rule.event,
        durationMs,
        conditions: evalResult.trace,
      };
      traces.push(trace);
      onRuleEvaluated?.(trace);

      results.push({ rule: rule.name, result: evalResult.result, event: rule.event });

      if (evalResult.result) {
        passed.push(rule.event);
        await this.#emitter.emitAsync('success', rule.event, almanac, rule.name);
        if (rule.onSuccess) await rule.onSuccess(rule.event, almanac);
        if (options.stopOnFirstEvent) break;
      } else {
        failed.push(rule.event);
        await this.#emitter.emitAsync('failure', rule.event, almanac, rule.name);
        if (rule.onFailure) await rule.onFailure(rule.event, almanac);
      }
    }

    return { passed, failed, trace: traces, results };
  }
}

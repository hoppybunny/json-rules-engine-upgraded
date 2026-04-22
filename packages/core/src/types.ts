/**
 * Public type surface for json-rules-engine-upgraded.
 *
 * All runtime modules import from this file; it is the single source of truth
 * for the rule DSL shape, engine options, events, and traces.
 */

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type FactStore = Record<string, JsonValue>;

/**
 * DSL version emitted in rule JSON. Major bumps indicate breaking changes;
 * rules with an unknown major version are rejected at load time.
 */
export const DSL_VERSION = '1.0.0' as const;
export type DslVersion = typeof DSL_VERSION;

/**
 * Reference to a fact, usable as a condition's compared-against value to
 * compare two dynamic values (not just fact vs. literal).
 */
export interface FactReference {
  fact: string;
  params?: Record<string, JsonValue>;
  path?: string;
}

export type ConditionValue = JsonValue | FactReference;

export interface LeafCondition {
  fact: string;
  operator: string;
  value: ConditionValue;
  path?: string;
  params?: Record<string, JsonValue>;
  name?: string;
}

export interface AllCondition {
  all: Condition[];
  name?: string;
  priority?: number;
}

export interface AnyCondition {
  any: Condition[];
  name?: string;
  priority?: number;
}

export interface NotCondition {
  not: Condition;
  name?: string;
}

export type Condition = LeafCondition | AllCondition | AnyCondition | NotCondition;

export interface Event<
  TType extends string = string,
  TParams extends Record<string, JsonValue> = Record<string, JsonValue>,
> {
  type: TType;
  params?: TParams;
}

/**
 * A rule is a named condition tree with an event emitted on success.
 * Optional lifecycle hooks run after evaluation; they are callable only
 * when rules are supplied through code, not loaded from JSON.
 */
export interface Rule<TEvent extends Event = Event> {
  $schema?: string;
  name: string;
  priority?: number;
  conditions: Condition;
  event: TEvent;
  onSuccess?: RuleHook<TEvent>;
  onFailure?: RuleHook<TEvent>;
}

export type RuleHook<TEvent extends Event = Event> = (
  event: TEvent,
  almanac: Almanac,
) => void | Promise<void>;

export type FactResolver = (
  params: Record<string, JsonValue> | undefined,
  almanac: Almanac,
) => JsonValue | Promise<JsonValue>;

export interface FactDefinition {
  id: string;
  value?: JsonValue;
  resolver?: FactResolver;
  cache?: boolean;
}

export interface Almanac {
  factValue<T extends JsonValue = JsonValue>(
    name: string,
    params?: Record<string, JsonValue>,
    path?: string,
  ): Promise<T>;
  addRuntimeFact(name: string, value: JsonValue): void;
  getFactValues(): Promise<Record<string, JsonValue>>;
}

export interface OperatorDefinition {
  name: string;
  evaluate: (factValue: JsonValue, conditionValue: JsonValue) => boolean;
  /**
   * Optional validator run at rule-load time. Throw to reject a rule.
   * Used e.g. to reject unsafe regex patterns before runtime.
   */
  validateConditionValue?: (value: JsonValue) => void;
}

export type EngineEventName =
  | 'success'
  | 'failure'
  | 'before-rule'
  | 'before-condition'
  | 'on-fact-missing';

export interface EngineEventMap {
  'success': (event: Event, almanac: Almanac, ruleName: string) => void | Promise<void>;
  'failure': (event: Event, almanac: Almanac, ruleName: string) => void | Promise<void>;
  'before-rule': (ruleName: string, almanac: Almanac) => void | Promise<void>;
  'before-condition': (condition: Condition, almanac: Almanac) => void | Promise<void>;
  'on-fact-missing': (factName: string, almanac: Almanac) => void | Promise<void>;
}

export interface RunOptions {
  allowUndefinedFacts?: boolean;
  stopOnFirstEvent?: boolean;
  onRuleEvaluated?: (trace: RuleTrace) => void;
}

export interface ConditionTrace {
  kind: 'leaf' | 'all' | 'any' | 'not';
  name?: string;
  result: boolean;
  fact?: string;
  operator?: string;
  path?: string;
  factValue?: JsonValue;
  conditionValue?: JsonValue;
  error?: string;
  children?: ConditionTrace[];
}

export interface RuleTrace {
  rule: string;
  priority: number;
  result: boolean;
  event: Event;
  durationMs: number;
  conditions: ConditionTrace;
}

export interface RuleResult<TEvent extends Event = Event> {
  rule: string;
  result: boolean;
  event: TEvent;
}

export interface RunResult<TEvent extends Event = Event> {
  passed: TEvent[];
  failed: TEvent[];
  trace: RuleTrace[];
  results: RuleResult<TEvent>[];
}

export interface EngineOptions {
  allowUndefinedFacts?: boolean;
  onRuleEvaluated?: (trace: RuleTrace) => void;
}

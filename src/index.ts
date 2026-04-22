export { Engine } from './engine.js';
export { AlmanacImpl, deepFreeze } from './almanac.js';
export { OperatorRegistry, builtInOperators } from './operators/index.js';
export { deepEqual, assertSafeRegex } from './operators/builtin.js';
export {
  evaluateCondition,
  isAllCondition,
  isAnyCondition,
  isFactReference,
  isLeafCondition,
  isNotCondition,
} from './condition.js';
export { validateRule, assertSupportedSchema, toJSON, fromJSON } from './rule.js';
export { parsePath, resolvePath } from './path.js';
export { formatTrace, summarizeTrace } from './tracer.js';
export { staticFact, dynamicFact, factRef } from './fact.js';
export { TinyEmitter } from './event.js';
export { RULE_JSON_SCHEMA } from './schema.js';
export {
  RulesEngineError,
  FactMissingError,
  OperatorUnknownError,
  OperatorValidationError,
  CyclicFactError,
  PathInvalidError,
  RuleInvalidError,
  ConditionInvalidError,
  DuplicateRegistrationError,
  DslVersionError,
} from './errors.js';
export { DSL_VERSION } from './types.js';
export type {
  Almanac,
  AllCondition,
  AnyCondition,
  Condition,
  ConditionTrace,
  ConditionValue,
  DslVersion,
  EngineEventMap,
  EngineEventName,
  EngineOptions,
  Event,
  FactDefinition,
  FactReference,
  FactResolver,
  FactStore,
  JsonPrimitive,
  JsonValue,
  LeafCondition,
  NotCondition,
  OperatorDefinition,
  Rule,
  RuleHook,
  RuleResult,
  RuleTrace,
  RunOptions,
  RunResult,
} from './types.js';
export type {
  RulesEngineErrorCode,
  RulesEngineErrorContext,
} from './errors.js';
export type { RuleJsonSchema } from './schema.js';

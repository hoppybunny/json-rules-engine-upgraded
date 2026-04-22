import type { JsonValue } from './types.js';

export type RulesEngineErrorCode =
  | 'FACT_MISSING'
  | 'OPERATOR_UNKNOWN'
  | 'OPERATOR_VALIDATION_FAILED'
  | 'CYCLIC_FACT'
  | 'PATH_INVALID'
  | 'RULE_INVALID'
  | 'RULE_NAME_DUPLICATE'
  | 'FACT_NAME_DUPLICATE'
  | 'OPERATOR_NAME_DUPLICATE'
  | 'DSL_VERSION_UNSUPPORTED'
  | 'CONDITION_INVALID';

export interface RulesEngineErrorContext {
  ruleName?: string;
  conditionPath?: string;
  operator?: string;
  factName?: string;
  factValue?: JsonValue;
  path?: string;
  cause?: unknown;
}

export class RulesEngineError extends Error {
  readonly code: RulesEngineErrorCode;
  readonly context: RulesEngineErrorContext;

  constructor(code: RulesEngineErrorCode, message: string, context: RulesEngineErrorContext = {}) {
    super(message);
    this.name = 'RulesEngineError';
    this.code = code;
    this.context = context;
  }
}

export class FactMissingError extends RulesEngineError {
  constructor(factName: string, context: RulesEngineErrorContext = {}) {
    super('FACT_MISSING', `Fact "${factName}" is not defined`, { ...context, factName });
    this.name = 'FactMissingError';
  }
}

export class OperatorUnknownError extends RulesEngineError {
  constructor(operator: string, context: RulesEngineErrorContext = {}) {
    super('OPERATOR_UNKNOWN', `Operator "${operator}" is not registered`, { ...context, operator });
    this.name = 'OperatorUnknownError';
  }
}

export class OperatorValidationError extends RulesEngineError {
  constructor(operator: string, message: string, context: RulesEngineErrorContext = {}) {
    super('OPERATOR_VALIDATION_FAILED', `Operator "${operator}" rejected condition value: ${message}`, {
      ...context,
      operator,
    });
    this.name = 'OperatorValidationError';
  }
}

export class CyclicFactError extends RulesEngineError {
  constructor(factName: string, chain: string[]) {
    super('CYCLIC_FACT', `Cyclic fact dependency detected: ${chain.concat(factName).join(' -> ')}`, {
      factName,
    });
    this.name = 'CyclicFactError';
  }
}

export class PathInvalidError extends RulesEngineError {
  constructor(path: string, context: RulesEngineErrorContext = {}) {
    super('PATH_INVALID', `Invalid path "${path}"`, { ...context, path });
    this.name = 'PathInvalidError';
  }
}

export class RuleInvalidError extends RulesEngineError {
  constructor(message: string, context: RulesEngineErrorContext = {}) {
    super('RULE_INVALID', message, context);
    this.name = 'RuleInvalidError';
  }
}

export class ConditionInvalidError extends RulesEngineError {
  constructor(message: string, context: RulesEngineErrorContext = {}) {
    super('CONDITION_INVALID', message, context);
    this.name = 'ConditionInvalidError';
  }
}

export class DuplicateRegistrationError extends RulesEngineError {
  constructor(kind: 'rule' | 'fact' | 'operator', name: string) {
    const codeMap = {
      rule: 'RULE_NAME_DUPLICATE',
      fact: 'FACT_NAME_DUPLICATE',
      operator: 'OPERATOR_NAME_DUPLICATE',
    } as const;
    super(codeMap[kind], `A ${kind} with name "${name}" is already registered`, {});
    this.name = 'DuplicateRegistrationError';
  }
}

export class DslVersionError extends RulesEngineError {
  constructor(found: string, supported: string, context: RulesEngineErrorContext = {}) {
    super(
      'DSL_VERSION_UNSUPPORTED',
      `Rule uses DSL version "${found}"; this engine supports "${supported}"`,
      context,
    );
    this.name = 'DslVersionError';
  }
}

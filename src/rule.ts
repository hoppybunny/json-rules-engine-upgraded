import { DslVersionError, RuleInvalidError } from './errors.js';
import type { OperatorRegistry } from './operators/index.js';
import { parsePath } from './path.js';
import {
  isAllCondition,
  isAnyCondition,
  isLeafCondition,
  isNotCondition,
  isFactReference,
} from './condition.js';
import { DSL_VERSION } from './types.js';
import type { Condition, Event, Rule } from './types.js';

const DSL_SCHEMA_URL_PREFIX = 'https://json-rules-engine-upgraded.dev/schema/v';

function parseVersion(spec: string): { major: number; raw: string } {
  const raw = spec.startsWith(DSL_SCHEMA_URL_PREFIX) ? spec.slice(DSL_SCHEMA_URL_PREFIX.length) : spec;
  const head = raw.split('.')[0]!;
  const major = Number.parseInt(head, 10);
  if (!Number.isInteger(major)) {
    throw new DslVersionError(spec, DSL_VERSION);
  }
  return { major, raw };
}

export function assertSupportedSchema(spec: string | undefined): void {
  if (!spec) return;
  const { major } = parseVersion(spec);
  const supported = parseVersion(DSL_VERSION).major;
  if (major !== supported) {
    throw new DslVersionError(spec, DSL_VERSION);
  }
}

export interface ValidateRuleOptions {
  operators: OperatorRegistry;
}

export function validateRule(rule: Rule, opts: ValidateRuleOptions): void {
  if (!rule || typeof rule !== 'object') {
    throw new RuleInvalidError('rule must be an object');
  }
  if (typeof rule.name !== 'string' || rule.name.length === 0) {
    throw new RuleInvalidError('rule.name must be a non-empty string');
  }
  assertSupportedSchema(rule.$schema);
  if (rule.priority !== undefined && typeof rule.priority !== 'number') {
    throw new RuleInvalidError('rule.priority must be a number when set', { ruleName: rule.name });
  }
  if (!rule.event || typeof rule.event !== 'object' || typeof rule.event.type !== 'string') {
    throw new RuleInvalidError('rule.event.type is required', { ruleName: rule.name });
  }
  if (!rule.conditions) {
    throw new RuleInvalidError('rule.conditions is required', { ruleName: rule.name });
  }
  validateCondition(rule.conditions, rule.name, '', opts);
}

function validateCondition(
  c: Condition,
  ruleName: string,
  path: string,
  opts: ValidateRuleOptions,
): void {
  if (!c || typeof c !== 'object') {
    throw new RuleInvalidError('condition must be an object', {
      ruleName,
      conditionPath: path,
    });
  }
  if (isAllCondition(c)) {
    if (c.all.length === 0) {
      throw new RuleInvalidError('`all` must contain at least one child condition', {
        ruleName,
        conditionPath: path,
      });
    }
    c.all.forEach((child, i) => validateCondition(child, ruleName, `${path}/all[${i}]`, opts));
    return;
  }
  if (isAnyCondition(c)) {
    if (c.any.length === 0) {
      throw new RuleInvalidError('`any` must contain at least one child condition', {
        ruleName,
        conditionPath: path,
      });
    }
    c.any.forEach((child, i) => validateCondition(child, ruleName, `${path}/any[${i}]`, opts));
    return;
  }
  if (isNotCondition(c)) {
    validateCondition(c.not, ruleName, `${path}/not`, opts);
    return;
  }
  if (isLeafCondition(c)) {
    if (typeof c.fact !== 'string' || c.fact.length === 0) {
      throw new RuleInvalidError('leaf condition requires a non-empty `fact`', {
        ruleName,
        conditionPath: path,
      });
    }
    if (typeof c.operator !== 'string' || !opts.operators.has(c.operator)) {
      throw new RuleInvalidError(`unknown operator "${c.operator}"`, {
        ruleName,
        conditionPath: path,
        operator: c.operator,
      });
    }
    if (c.path !== undefined) {
      try {
        parsePath(c.path);
      } catch (err) {
        throw new RuleInvalidError(`invalid path "${c.path}": ${(err as Error).message}`, {
          ruleName,
          conditionPath: path,
          path: c.path,
        });
      }
    }
    if (!isFactReference(c.value)) {
      opts.operators.validateConditionValue(c.operator, c.value);
    }
    return;
  }
  throw new RuleInvalidError('condition must be leaf or contain all/any/not', {
    ruleName,
    conditionPath: path,
  });
}

/** Strip non-serializable fields (onSuccess/onFailure hooks) and return
 *  a plain object suitable for JSON.stringify. Round-trip via fromJSON. */
export function toJSON<TEvent extends Event>(rule: Rule<TEvent>): Omit<Rule<TEvent>, 'onSuccess' | 'onFailure'> {
  const { onSuccess: _onSuccess, onFailure: _onFailure, ...rest } = rule;
  void _onSuccess;
  void _onFailure;
  return { $schema: rule.$schema ?? DSL_VERSION, ...rest };
}

export function fromJSON<TEvent extends Event = Event>(
  raw: unknown,
  opts: ValidateRuleOptions,
): Rule<TEvent> {
  if (!raw || typeof raw !== 'object') {
    throw new RuleInvalidError('rule JSON must be an object');
  }
  const rule = raw as Rule<TEvent>;
  validateRule(rule as unknown as Rule, opts);
  return rule;
}

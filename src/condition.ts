import { ConditionInvalidError } from './errors.js';
import type { OperatorRegistry } from './operators/index.js';
import type {
  Almanac,
  AllCondition,
  AnyCondition,
  Condition,
  ConditionTrace,
  ConditionValue,
  FactReference,
  JsonValue,
  LeafCondition,
  NotCondition,
} from './types.js';

interface EvaluateContext {
  ruleName: string;
  almanac: Almanac;
  operators: OperatorRegistry;
  path: string;
}

export interface EvaluationResult {
  result: boolean;
  trace: ConditionTrace;
}

export function isLeafCondition(c: Condition): c is LeafCondition {
  return typeof (c as LeafCondition).operator === 'string';
}

export function isAllCondition(c: Condition): c is AllCondition {
  return Array.isArray((c as AllCondition).all);
}

export function isAnyCondition(c: Condition): c is AnyCondition {
  return Array.isArray((c as AnyCondition).any);
}

export function isNotCondition(c: Condition): c is NotCondition {
  return 'not' in c && !isLeafCondition(c as Condition);
}

export function isFactReference(value: ConditionValue): value is FactReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as FactReference).fact === 'string'
  );
}

export async function evaluateCondition(
  condition: Condition,
  ctx: EvaluateContext,
): Promise<EvaluationResult> {
  if (isAllCondition(condition)) return evaluateAll(condition, ctx);
  if (isAnyCondition(condition)) return evaluateAny(condition, ctx);
  if (isNotCondition(condition)) return evaluateNot(condition, ctx);
  if (isLeafCondition(condition)) return evaluateLeaf(condition, ctx);
  throw new ConditionInvalidError('condition is neither leaf nor all/any/not', {
    ruleName: ctx.ruleName,
    conditionPath: ctx.path,
  });
}

function sortByPriority(children: Condition[]): Condition[] {
  return [...children].sort((a, b) => {
    const ap = (a as AllCondition).priority ?? (a as LeafCondition).params?.priority ?? 0;
    const bp = (b as AllCondition).priority ?? (b as LeafCondition).params?.priority ?? 0;
    return Number(bp) - Number(ap);
  });
}

async function evaluateAll(
  condition: AllCondition,
  ctx: EvaluateContext,
): Promise<EvaluationResult> {
  const children: ConditionTrace[] = [];
  const ordered = sortByPriority(condition.all);
  let result = true;
  for (let i = 0; i < ordered.length; i++) {
    const child = ordered[i]!;
    const res = await evaluateCondition(child, { ...ctx, path: `${ctx.path}/all[${i}]` });
    children.push(res.trace);
    if (!res.result) {
      result = false;
      break;
    }
  }
  return {
    result,
    trace: {
      kind: 'all',
      ...(condition.name !== undefined ? { name: condition.name } : {}),
      result,
      children,
    },
  };
}

async function evaluateAny(
  condition: AnyCondition,
  ctx: EvaluateContext,
): Promise<EvaluationResult> {
  const children: ConditionTrace[] = [];
  const ordered = sortByPriority(condition.any);
  let result = false;
  for (let i = 0; i < ordered.length; i++) {
    const child = ordered[i]!;
    const res = await evaluateCondition(child, { ...ctx, path: `${ctx.path}/any[${i}]` });
    children.push(res.trace);
    if (res.result) {
      result = true;
      break;
    }
  }
  return {
    result,
    trace: {
      kind: 'any',
      ...(condition.name !== undefined ? { name: condition.name } : {}),
      result,
      children,
    },
  };
}

async function evaluateNot(
  condition: NotCondition,
  ctx: EvaluateContext,
): Promise<EvaluationResult> {
  const inner = await evaluateCondition(condition.not, { ...ctx, path: `${ctx.path}/not` });
  const result = !inner.result;
  return {
    result,
    trace: {
      kind: 'not',
      ...(condition.name !== undefined ? { name: condition.name } : {}),
      result,
      children: [inner.trace],
    },
  };
}

async function resolveConditionValue(
  value: ConditionValue,
  ctx: EvaluateContext,
): Promise<JsonValue> {
  if (!isFactReference(value)) return value as JsonValue;
  return ctx.almanac.factValue(value.fact, value.params, value.path);
}

async function evaluateLeaf(
  condition: LeafCondition,
  ctx: EvaluateContext,
): Promise<EvaluationResult> {
  const factValue = await ctx.almanac.factValue(
    condition.fact,
    condition.params,
    condition.path,
  );
  const conditionValue = await resolveConditionValue(condition.value, ctx);
  let result = false;
  let errorMessage: string | undefined;
  try {
    result = ctx.operators.evaluate(condition.operator, factValue, conditionValue);
  } catch (err) {
    errorMessage = (err as Error).message;
    throw err;
  } finally {
    void errorMessage;
  }
  return {
    result,
    trace: {
      kind: 'leaf',
      ...(condition.name !== undefined ? { name: condition.name } : {}),
      result,
      fact: condition.fact,
      operator: condition.operator,
      ...(condition.path !== undefined ? { path: condition.path } : {}),
      factValue,
      conditionValue,
    },
  };
}

import type { ConditionTrace, RuleTrace } from './types.js';

/** Render a single rule trace as a plain-text tree — useful for debug logs. */
export function formatTrace(trace: RuleTrace): string {
  const header = `${trace.result ? '✓' : '✗'} ${trace.rule} (priority=${trace.priority}, ${trace.durationMs.toFixed(2)}ms)`;
  return [header, ...formatCondition(trace.conditions, '  ')].join('\n');
}

function formatCondition(node: ConditionTrace, indent: string): string[] {
  const mark = node.result ? '✓' : '✗';
  const label = node.name ? ` "${node.name}"` : '';
  let head: string;
  if (node.kind === 'leaf') {
    head = `${indent}${mark} ${node.fact}${node.path ? node.path : ''} ${node.operator} ${JSON.stringify(
      node.conditionValue,
    )} [got ${JSON.stringify(node.factValue)}]${label}`;
  } else if (node.kind === 'not') {
    head = `${indent}${mark} NOT${label}`;
  } else {
    head = `${indent}${mark} ${node.kind.toUpperCase()}${label}`;
  }
  const children = node.children ?? [];
  return [head, ...children.flatMap((c) => formatCondition(c, indent + '  '))];
}

/** One-line trace summary, useful for metrics. */
export function summarizeTrace(trace: RuleTrace): {
  rule: string;
  result: boolean;
  durationMs: number;
  nodesEvaluated: number;
} {
  return {
    rule: trace.rule,
    result: trace.result,
    durationMs: trace.durationMs,
    nodesEvaluated: countNodes(trace.conditions),
  };
}

function countNodes(node: ConditionTrace): number {
  const self = 1;
  const children = node.children ?? [];
  return self + children.reduce((acc, c) => acc + countNodes(c), 0);
}

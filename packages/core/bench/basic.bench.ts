import { bench, describe } from 'vitest';
import { Engine } from '../src/engine.js';
import type { Rule } from '../src/types.js';

function buildRules(count: number): Rule[] {
  const out: Rule[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      name: `r${i}`,
      priority: i % 10,
      conditions: {
        all: [
          { fact: 'score', operator: 'greaterThanInclusive', value: i % 100 },
          { fact: 'country', operator: 'in', value: ['US', 'CA', 'UK', 'DE', 'FR'] },
          {
            any: [
              { fact: 'tier', operator: 'equal', value: 'premium' },
              { fact: 'flags', operator: 'contains', value: `feature-${i % 20}` },
            ],
          },
        ],
      },
      event: { type: `event-${i}` },
    });
  }
  return out;
}

describe('Engine throughput', () => {
  const engine100 = new Engine(buildRules(100));
  const engine1000 = new Engine(buildRules(1000));
  const facts = {
    score: 75,
    country: 'US',
    tier: 'premium',
    flags: ['feature-5', 'feature-17'],
  };

  bench('100 rules × 1 fact set', async () => {
    await engine100.run(facts);
  });

  bench('1000 rules × 1 fact set', async () => {
    await engine1000.run(facts);
  });
});

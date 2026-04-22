import { describe, expect, it } from 'vitest';
import { Engine } from '../../src/engine.js';

describe('feature flag rollout', () => {
  const rule = {
    name: 'newCheckoutFlow',
    priority: 10,
    conditions: {
      all: [
        { fact: 'user', path: '$.country', operator: 'in', value: ['US', 'CA', 'UK'] },
        {
          any: [
            { fact: 'user', path: '$.betaTester', operator: 'equal', value: true },
            {
              all: [
                { fact: 'user', path: '$.tier', operator: 'equal', value: 'enterprise' },
                { fact: 'user', path: '$.mrr', operator: 'greaterThanInclusive', value: 1000 },
              ],
            },
          ],
        },
        { not: { fact: 'user', path: '$.churned', operator: 'equal', value: true } },
      ],
    },
    event: { type: 'enableFeature', params: { flag: 'new-checkout' } },
  } as const;

  it('enables for a beta tester in the US', async () => {
    const engine = new Engine([rule]);
    const r = await engine.run({
      user: { country: 'US', betaTester: true, tier: 'free', mrr: 0, churned: false },
    });
    expect(r.passed.map((e) => e.type)).toEqual(['enableFeature']);
  });

  it('enables for an enterprise customer over $1000 MRR', async () => {
    const engine = new Engine([rule]);
    const r = await engine.run({
      user: { country: 'UK', betaTester: false, tier: 'enterprise', mrr: 1500, churned: false },
    });
    expect(r.passed.map((e) => e.type)).toEqual(['enableFeature']);
  });

  it('does not enable for a churned user', async () => {
    const engine = new Engine([rule]);
    const r = await engine.run({
      user: { country: 'UK', betaTester: true, tier: 'enterprise', mrr: 5000, churned: true },
    });
    expect(r.passed).toHaveLength(0);
  });

  it('does not enable for an excluded country', async () => {
    const engine = new Engine([rule]);
    const r = await engine.run({
      user: { country: 'FR', betaTester: true, tier: 'enterprise', mrr: 9999, churned: false },
    });
    expect(r.passed).toHaveLength(0);
  });
});

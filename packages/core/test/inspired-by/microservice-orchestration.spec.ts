import { describe, expect, it } from 'vitest';
import { Engine } from '../../src/engine.js';

describe('microservice orchestration (async fact chains)', () => {
  it('resolves a chain of async facts and fires an event', async () => {
    const engine = new Engine();

    engine.addFact('userId', 'user-42');

    engine.addFact('account', async (_params, almanac) => {
      const id = await almanac.factValue<string>('userId');
      return { id, tier: 'premium', createdAt: '2025-06-01' };
    });

    engine.addFact('tier', async (_params, almanac) => {
      const account = await almanac.factValue<{ tier: string }>('account');
      return account.tier;
    });

    engine.addFact('daysSinceSignup', async (_params, almanac) => {
      const account = await almanac.factValue<{ createdAt: string }>('account');
      const created = new Date(account.createdAt).getTime();
      const now = new Date('2026-04-01').getTime();
      return Math.floor((now - created) / (24 * 60 * 60 * 1000));
    });

    engine.addRule({
      name: 'premiumVetenanUpsell',
      conditions: {
        all: [
          { fact: 'tier', operator: 'equal', value: 'premium' },
          { fact: 'daysSinceSignup', operator: 'greaterThan', value: 180 },
        ],
      },
      event: { type: 'upsell', params: { channel: 'email' } },
    });

    const result = await engine.run();
    expect(result.passed).toHaveLength(1);
    expect(result.passed[0]?.type).toBe('upsell');
  });

  it('caches the expensive `account` fact despite two dependents', async () => {
    let accountCalls = 0;
    const engine = new Engine();
    engine.addFact('account', () => {
      accountCalls++;
      return { tier: 'free', plan: 'basic' };
    });
    engine.addFact('tier', async (_p, a) => (await a.factValue<{ tier: string }>('account')).tier);
    engine.addFact('plan', async (_p, a) => (await a.factValue<{ plan: string }>('account')).plan);
    engine.addRule({
      name: 'r',
      conditions: {
        all: [
          { fact: 'tier', operator: 'equal', value: 'free' },
          { fact: 'plan', operator: 'equal', value: 'basic' },
        ],
      },
      event: { type: 'ok' },
    });
    await engine.run();
    expect(accountCalls).toBe(1);
  });
});

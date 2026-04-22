import { describe, expect, it } from 'vitest';
import { Engine } from '../../src/engine.js';

describe('basketball foul-out (inspired by json-rules-engine README)', () => {
  it('fouls a player out at 5 fouls in a full game', async () => {
    const engine = new Engine([
      {
        name: 'foulOut',
        conditions: {
          all: [
            { fact: 'gameDuration', operator: 'equal', value: 40 },
            { fact: 'personalFoulCount', operator: 'greaterThanInclusive', value: 5 },
          ],
        },
        event: { type: 'fouledOut', params: { message: 'player fouled out' } },
      },
    ]);

    const outcome = await engine.run({ gameDuration: 40, personalFoulCount: 6 });
    expect(outcome.passed).toHaveLength(1);
    expect(outcome.passed[0]).toEqual({
      type: 'fouledOut',
      params: { message: 'player fouled out' },
    });
  });

  it('does not foul out when under the threshold', async () => {
    const engine = new Engine([
      {
        name: 'foulOut',
        conditions: {
          all: [
            { fact: 'gameDuration', operator: 'equal', value: 40 },
            { fact: 'personalFoulCount', operator: 'greaterThanInclusive', value: 5 },
          ],
        },
        event: { type: 'fouledOut' },
      },
    ]);
    const outcome = await engine.run({ gameDuration: 40, personalFoulCount: 3 });
    expect(outcome.passed).toHaveLength(0);
    expect(outcome.failed).toHaveLength(1);
  });
});

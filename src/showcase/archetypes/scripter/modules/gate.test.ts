import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { beats, boot, tick, tickUntil } from '../sim/harness';
import { ANCHORS, ARRIVAL_GATES } from '../data';
import { getDojo, getGate, getKata, getLineage } from '.';

/** Earn enough all-time Ki for a challenger's gate. */
function earnTo(gate: number) {
  addResource(getDojo().ki, Decimal.add(gate, 1));
}

describe('the gate', () => {
  beforeEach(() => boot());

  it('announces a challenger once all-time Ki passes its gate, then opens the bout', async () => {
    getKata().ink('strike');
    earnTo(ARRIVAL_GATES.post);
    await tick(1);
    expect(getLineage().arrived.value).toEqual(['post']);
    expect(getGate().next.value?.id).toBe('post');
    expect(getGate().inBout.value).toBe(false);
    await tick(ANCHORS.announceSeconds * 20 + 2);
    expect(getGate().inBout.value).toBe(true);
  });

  it('turns blows on the challenger during a bout, not into training Ki', async () => {
    getKata().ink('strike');
    earnTo(ARRIVAL_GATES.post);
    await tickUntil(() => getGate().inBout.value, 2000);
    const ki = Decimal.fromValue(getDojo().ki.value);
    await beats(2);
    expect(getGate().bout.value!.attackers[0].hp).toBeLessThan(8);
    expect(Decimal.fromValue(getDojo().ki.value).lte(ki)).toBe(true);
  });

  it('pays a bounty for a win and raises the standing on the first one', async () => {
    getKata().ink('strike');
    earnTo(ARRIVAL_GATES.post);
    await tickUntil(() => getGate().inBout.value, 2000);
    const ki = Decimal.fromValue(getDojo().ki.value);
    await tickUntil(() => !getGate().inBout.value, 4000);
    expect(getGate().last.value).toMatchObject({ id: 'post', won: true });
    expect(Decimal.fromValue(getDojo().ki.value).gt(ki)).toBe(true);
    expect(getLineage().beaten.value).toEqual(['post']);
    expect(getLineage().standing.value).toBeGreaterThan(1);
  });

  it('schedules a beaten challenger to return', async () => {
    getKata().ink('strike');
    earnTo(ARRIVAL_GATES.post);
    await tickUntil(() => getLineage().beaten.value.length === 1, 6000);
    expect(getGate().next.value?.id).toBe('post');
  });

  it('cannot be refused: a challenger the scroll cannot hurt still takes the bout, and leaves unbeaten', async () => {
    getKata().ink('strike');
    earnTo(ARRIVAL_GATES.ren);
    await tickUntil(() => getGate().bout.value?.challenger === 'ren', 20000);
    await tickUntil(() => !getGate().inBout.value, 20000);
    expect(getGate().last.value).toMatchObject({ id: 'ren', won: false });
  });
});

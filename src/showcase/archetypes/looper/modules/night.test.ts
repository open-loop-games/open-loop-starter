import { addResource, Decimal } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { boot, tick, tickUntil } from '../sim/harness';
import { getMeta } from './meta';
import { getNight } from './night';

const num = (v: unknown) => new Decimal(v as never).toNumber();

describe('night', () => {
  beforeEach(() => boot());

  it('drains Nerve while the night runs and ends the night when it is empty', async () => {
    const night = getNight();
    getMeta().plan.value = [{ id: 'push-ups', times: 99 }];
    night.beginNight();
    const start = num(night.nerve.value);
    await tick(20);
    expect(num(night.nerve.value)).toBeLessThan(start);

    await tickUntil(() => !night.nightActive.value, 10_000);
    expect(night.cycle.count.value).toBe(1);
    expect(night.lastNight.value?.cause).toBe('nerve');
  });

  it('runs the plan in order: a bent wire becomes the pick that opens the cell', async () => {
    const night = getNight();
    const meta = getMeta();
    meta.plan.value = [
      { id: 'bend-wire', times: 1 },
      { id: 'pick-cell', times: 1 },
    ];
    night.beginNight();
    await tickUntil(() => night.depth.value >= 1, 10_000);

    expect(meta.zones.isUnlocked('corridor')).toBe(true);
    expect(num(night.items.picks.value)).toBe(0);
    expect(night.splits.value[1]).toBeGreaterThan(0);
  });

  it('skips an action whose items are not held', async () => {
    const night = getNight();
    getMeta().plan.value = [
      { id: 'pick-cell', times: 1 },
      { id: 'push-ups', times: 1 },
    ];
    night.beginNight();
    await tickUntil(() => night.actions.getState('push-ups')!.done.value === 1, 10_000);

    expect(night.depth.value).toBe(0);
    expect(night.actions.getState('pick-cell')!.done.value).toBe(0);
  });

  it('resets the night at its end and keeps what mastery banked', async () => {
    const night = getNight();
    const meta = getMeta();
    meta.plan.value = [
      { id: 'bend-wire', times: 2 },
      { id: 'push-ups', times: 99 },
    ];
    night.beginNight();
    await tickUntil(() => night.actions.getState('bend-wire')!.done.value === 2, 10_000);
    expect(num(night.items.picks.value)).toBe(2);
    expect(num(night.talent.getSkill('brawn')!.xp.value)).toBe(0);
    await tickUntil(() => num(night.talent.getSkill('brawn')!.xp.value) > 0, 10_000);

    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);

    expect(num(night.items.picks.value)).toBe(0);
    expect(night.actions.getState('bend-wire')!.done.value).toBe(0);
    expect(num(night.talent.getSkill('finesse')!.xp.value)).toBe(0);
    expect(num(night.mastery.getSkill('finesse')!.lifetimeBonus!.value)).toBeGreaterThan(0);
  });

  it('pays Intel for each landmark reached, and nothing for a night that reached none', async () => {
    const night = getNight();
    const meta = getMeta();
    meta.plan.value = [{ id: 'push-ups', times: 2 }];
    night.beginNight();
    await tickUntil(() => night.actions.getState('push-ups')!.done.value === 2, 10_000);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);
    expect(num(meta.intel.value)).toBe(0);

    meta.plan.value = [
      { id: 'bend-wire', times: 1 },
      { id: 'pick-cell', times: 1 },
    ];
    night.beginNight();
    await tickUntil(() => night.depth.value >= 1, 10_000);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);
    expect(num(meta.intel.value)).toBeGreaterThan(0);
  });

  it('turning in ends the night at once and records the cause', async () => {
    const night = getNight();
    getMeta().plan.value = [{ id: 'push-ups', times: 99 }];
    night.beginNight();
    await tick(10);
    night.turnIn();
    await tick(1);

    expect(night.nightActive.value).toBe(false);
    expect(night.lastNight.value?.cause).toBe('turned-in');
  });

  it('a note bought between nights lengthens the next night', async () => {
    const night = getNight();
    const meta = getMeta();
    const before = night.maxNerve.value;
    addResource(meta.intel, 1000);
    meta.notes.getPurchasable('steel-nerves')!.purchase(1);
    expect(night.maxNerve.value).toBeGreaterThan(before);

    night.beginNight();
    expect(num(night.nerve.value)).toBe(night.maxNerve.value);
  });
});

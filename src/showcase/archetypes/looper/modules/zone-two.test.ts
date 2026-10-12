import { addResource, Decimal } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { boot, tick, tickUntil } from '../sim/harness';
import { getMeta } from './meta';
import { getNight } from './night';

const num = (v: unknown) => new Decimal(v as never).toNumber();

type Carried = Partial<Record<'smokes' | 'picks', number>>;

/**
 * Begin a night standing past the wall, carrying `items`. Depth and items are
 * set before the night begins, because the executor checks each action as the
 * night starts it.
 */
function beginOutside(plan: { id: string; times: number }[], items: Carried = {}): void {
  const night = getNight();
  const meta = getMeta();
  meta.zones.unlock('woods');
  meta.zones.unlock('rail-yard');
  meta.plan.value = plan;
  night.depth.value = 5;
  for (const [id, n] of Object.entries(items)) addResource(night.items[id as keyof Carried], n);
  night.beginNight();
}

/** Begin a night in the corridor with `plan`. */
function beginInCorridor(plan: { id: string; times: number }[]): void {
  const night = getNight();
  const meta = getMeta();
  meta.zones.unlock('corridor');
  meta.plan.value = plan;
  night.depth.value = 1;
  night.beginNight();
}

describe('past the wall', () => {
  beforeEach(() => boot());

  it('the milk truck refills more Nerve the earlier it is caught', async () => {
    const night = getNight();
    beginOutside([{ id: 'ride', times: 1 }], { smokes: 1 });
    await tickUntil(() => night.actions.getState('ride')!.done.value === 1, 10_000);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);
    const early = night.lastNight.value!.ride;

    beginOutside(
      [
        { id: 'push-ups', times: 10 },
        { id: 'ride', times: 1 },
      ],
      { smokes: 1 },
    );
    await tickUntil(() => night.actions.getState('ride')!.done.value === 1, 20_000);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);
    const late = night.lastNight.value!.ride;

    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThan(0);
  });

  it('the truck will not take you without smokes made inside', async () => {
    const night = getNight();
    beginOutside([
      { id: 'ride', times: 1 },
      { id: 'push-ups', times: 1 },
    ]);
    await tickUntil(() => night.actions.getState('push-ups')!.done.value === 1, 10_000);
    expect(night.actions.getState('ride')!.done.value).toBe(0);
  });

  it("the yard padlock spends a pick made in the cell, and opens the freight's gate", async () => {
    const night = getNight();
    beginOutside([
      { id: 'padlock', times: 1 },
      { id: 'push-ups', times: 1 },
    ]);
    await tickUntil(() => night.actions.getState('push-ups')!.done.value === 1, 10_000);
    expect(num(night.items.gate.value)).toBe(0);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);

    beginOutside([{ id: 'padlock', times: 1 }], { picks: 1 });
    await tickUntil(() => night.actions.getState('padlock')!.done.value === 1, 10_000);
    expect(num(night.items.picks.value)).toBe(0);
    expect(num(night.items.gate.value)).toBe(1);
  });
});

describe('the patrol', () => {
  beforeEach(() => boot());

  it('watching the patrol keeps knowledge across nights and shortens the slip', async () => {
    const night = getNight();
    const meta = getMeta();
    const before = night.actionSeconds('slip-patrol');
    beginInCorridor([{ id: 'learn-patrol', times: 2 }]);
    await tickUntil(() => night.actions.getState('learn-patrol')!.done.value === 2, 20_000);
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);

    expect(meta.patrolKnowledge.value).toBe(2);
    expect(night.actionSeconds('slip-patrol')).toBeLessThan(before);
    await tick(1);
    expect(meta.patrolKnowledge.value).toBe(2);
  });

  it('a learned patrol is skipped', async () => {
    const night = getNight();
    const meta = getMeta();
    meta.patrolKnowledge.value = 25;
    beginInCorridor([
      { id: 'learn-patrol', times: 1 },
      { id: 'push-ups', times: 1 },
    ]);
    await tickUntil(() => night.actions.getState('push-ups')!.done.value === 1, 10_000);
    expect(night.actions.getState('learn-patrol')!.done.value).toBe(0);
  });
});

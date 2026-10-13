import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ALL_WATCHES, ANCHORS, SUSPECT_AT, SUSPECT_CARDS, watchKey } from '../data';
import { boot, tick, tickUntil } from '../sim/harness';
import { toNight } from '../sim/phases';
import { getAutomation } from './automation';
import { getBox } from './box';
import { getCase } from './case';
import { getNight } from './night';

const num = (r: { value: unknown }) => toNumber(r.value as number);
const suspectWatch = ALL_WATCHES.find((k) => SUSPECT_AT[k])!;
const emptyWatches = ALL_WATCHES.filter((k) => !SUSPECT_AT[k]);

/** Run the replay to its next dawn. */
async function toDawn(): Promise<void> {
  const night = getNight();
  const count = night.cycle.count.value;
  await tickUntil(() => night.cycle.count.value > count, 20 * 200);
}

describe('the night', () => {
  beforeEach(() => {
    boot();
    toNight();
  });

  it('files a sighting at dawn, not before', async () => {
    const night = getNight();
    night.setPlan([suspectWatch]);
    await tick(20 * (ANCHORS.nightSeconds - 1));
    expect(night.seen.value[suspectWatch] ?? 0).toBe(0);

    await toDawn();
    expect(night.seen.value[suspectWatch]).toBe(1);
    expect(num(night.accounts)).toBeGreaterThan(0);
  });

  it('learns which watches are empty, and breaks the model when too many are', async () => {
    const night = getNight();
    night.rosterPlace.count.value = 4;
    const cap = night.strainCap.value;
    night.setPlan([suspectWatch, ...emptyWatches.slice(0, cap)]);
    expect(night.plan.value).toHaveLength(cap + 1);

    await toDawn();
    expect(night.seen.value[suspectWatch] ?? 0).toBe(0);
    expect(num(night.accounts)).toBe(0);
    expect(night.empty.value.length).toBeGreaterThan(0);
  });

  it('keeps no more watches than the roster staffs', () => {
    const night = getNight();
    night.setPlan(ALL_WATCHES);
    expect(night.plan.value.length).toBe(night.roster.value);
    expect(night.toggle(ALL_WATCHES.at(-1)!)).toBe(false);
  });

  it('holds an alibi once every hour of it is seen, and the six open the last door', async () => {
    const night = getNight();
    const { life } = getCase();
    const box = getBox();
    // Staff every suspect hour at once.
    night.rosterPlace.count.value = SUSPECT_CARDS.length;
    night.setPlan(SUSPECT_CARDS.map((c) => watchKey(c.where, c.when)));
    for (let n = 0; n < ANCHORS.sightingsPerHour; n++) await toDawn();

    expect(night.held.value.length).toBe(6);
    expect(life.open('box-returns')).toBe(true);
    expect(night.cycle.running.value).toBe(false);
    expect(box.readLast()).toBe(true);
    expect(getCase().closed.value).toBe(true);
  });
});

describe('the clerks’ planning', () => {
  beforeEach(() => {
    boot();
    toNight();
  });

  it('fills the empty watches with known suspects once its tier opens, and never searches', async () => {
    const night = getNight();
    const { tiers } = getAutomation();
    for (let n = 0; n < ANCHORS.planningTierNights; n++) await toDawn();
    expect(tiers.hasReached('planning')).toBe(true);

    night.setPlan([]);
    await toDawn();
    const known = new Set([...night.hints.value, ...Object.keys(night.seen.value)]);
    expect(night.plan.value.every((k) => known.has(k))).toBe(true);
  });
});

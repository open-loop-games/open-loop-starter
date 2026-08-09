/**
 * Arena behavioural spec — what the floor DOES, driven tick by tick on the real
 * assembled engine.
 *
 * No magnitudes: how many specimens, how much damage and how fast are balance
 * questions that `../balance/arena-probe.ts` prints. This layer asserts the
 * mechanics exist and are wired to each other, which is what stays true across
 * every retune.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ArenaKey } from './arena';
import { ARENA_BALANCE, COLLECTOR_BALANCE, collectRadiusFor } from '../data/arena';
import { REAGENTS } from '../data/devices';
import { META_UPGRADES } from '../data/meta';
import { boot, getEngine, tick } from '../sim/harness';

function arena() {
  const api = getEngine().tryInject(ArenaKey);
  if (!api) throw new Error('survivor/arena did not provide ArenaKey');
  return api;
}

describe('survivor/arena', () => {
  beforeEach(() => boot());

  it('starts a run with the operator alive and the floor empty', () => {
    arena().startRun('generalist');
    const s = arena().state.value;
    expect(s.time).toBe(0);
    expect(s.specimens).toHaveLength(0);
    expect(s.operator.hp).toBeGreaterThan(0);
    expect(arena().outcome.value).toBe('running');
  });

  it('opens with exactly one device installed', () => {
    arena().startRun('generalist');
    expect(arena().state.value.devices).toHaveLength(1);
  });

  it('spawns specimens once the run is under way', async () => {
    arena().startRun('generalist');
    await tick(200);
    expect(arena().state.value.specimens.length).toBeGreaterThan(0);
  });

  it('advances run time as it ticks', async () => {
    arena().startRun('generalist');
    await tick(100);
    expect(arena().state.value.time).toBeGreaterThan(0);
  });

  it('kills specimens and banks motes from them', async () => {
    arena().startRun('generalist');
    await tick(600);
    const stats = arena().state.value.stats;
    expect(stats.kills).toBeGreaterThan(0);
    expect(stats.motesDropped).toBeGreaterThan(0);
    expect(stats.motesBanked).toBeGreaterThan(0);
  });

  it('never banks more motes than it dropped', async () => {
    arena().startRun('generalist');
    await tick(600);
    const stats = arena().state.value.stats;
    expect(stats.motesBanked).toBeLessThanOrEqual(stats.motesDropped);
  });

  it('keeps the operator inside the map bounds', async () => {
    arena().startRun('kinetic');
    await tick(600);
    const { x, y } = arena().state.value.operator;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('holds live specimens under the declared entity budget', async () => {
    arena().startRun('generalist');
    await tick(1200);
    // The annulus bounds density; a breach here means spawning stopped being
    // bounded, which is a structural failure rather than a hard difficulty.
    expect(arena().state.value.specimens.length).toBeLessThanOrEqual(400);
  });

  it('stops stepping once a run has ended', async () => {
    arena().startRun('generalist');
    arena().endRun('survived');
    const before = arena().state.value.time;
    await tick(100);
    expect(arena().state.value.time).toBe(before);
  });

  it('rebuilds the floor when a new run starts', async () => {
    arena().startRun('generalist');
    await tick(400);
    expect(arena().state.value.stats.kills).toBeGreaterThan(0);
    arena().startRun('reactive');
    expect(arena().state.value.stats.kills).toBe(0);
    expect(arena().state.value.time).toBe(0);
  });

  it('is reproducible for a fixed seed', async () => {
    arena().startRun('generalist');
    await tick(300);
    const first = arena().state.value.stats.kills;
    arena().startRun('generalist');
    await tick(300);
    expect(arena().state.value.stats.kills).toBe(first);
  });
});

describe('survivor/arena — the aperture bound', () => {
  /**
   * `r_collect / r_kill` is this archetype's top coupling and two runtime
   * sources multiply it, so the property under test is that no combination of
   * them can reach the cap — not that today's combination happens to.
   */
  it('holds the collect radius below the kill radius however it is stacked', () => {
    const { killRadius, collectRadius, apertureCapRatio } = ARENA_BALANCE;
    const ceiling = killRadius * apertureCapRatio;

    expect(collectRadiusFor(1)).toBeCloseTo(collectRadius, 6);

    // Read off the defs rather than restated, so a retune of either source moves
    // this with it instead of pinning yesterday's numbers.
    const reclaimant = REAGENTS.find((r) => r.id === 'reclaimant')!;
    const aperture = META_UPGRADES.find((u) => u.id === 'wider-aperture')!;
    const stacked =
      Math.pow(reclaimant.perStack, reclaimant.maxStacks) *
      Math.pow(aperture.perLevel, aperture.maxLevel);

    // The regression this bound exists for: on a raw product the two shipping
    // sources put the aperture OUTSIDE the radius that feeds it.
    expect(collectRadius * stacked).toBeGreaterThan(killRadius);
    expect(collectRadiusFor(stacked)).toBeLessThan(ceiling);
    // The ceiling is an asymptote, so an unbounded multiplier approaches it and
    // never passes it — at which point the headroom term underflows the double
    // and the two are equal. "Never exceeds" is the property; "always strictly
    // below" would be asserting that floats have infinite precision.
    expect(collectRadiusFor(Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(ceiling);
  });

  it('still pays every stack, so no pick is wasted', () => {
    // The reason this is a headroom curve rather than a clamp: a clamp makes the
    // last stacks inert, which is a dial that stops reaching the player.
    expect(collectRadiusFor(2)).toBeGreaterThan(collectRadiusFor(1));
    expect(collectRadiusFor(4)).toBeGreaterThan(collectRadiusFor(2));
    expect(collectRadiusFor(8)).toBeGreaterThan(collectRadiusFor(4));
  });
});

describe('survivor/arena — the collector', () => {
  beforeEach(() => boot());

  it('rolls its drop times inside the run when a run starts', () => {
    arena().startRun('generalist');
    const s = arena().state.value;
    expect(s.collectorTimes).toHaveLength(COLLECTOR_BALANCE.perRun);
    expect(s.collectorsDropped).toBe(0);
    expect([...s.collectorTimes]).toEqual([...s.collectorTimes].sort((a, b) => a - b));
    for (const t of s.collectorTimes) expect(t).toBeGreaterThan(0);
  });

  it('banks the surrounding field when one is taken, not just what is underfoot', async () => {
    arena().startRun('generalist');
    await tick(400);
    const s = arena().state.value;
    const { x, y } = s.operator;

    // Motes placed beyond the ordinary aperture but inside the pull — the whole
    // point of a collector is that it reaches what walking over it would not.
    const far = COLLECTOR_BALANCE.pullRadius * 0.5;
    expect(far).toBeGreaterThan(collectRadiusFor(1));
    const before = s.stats.motesBanked;
    for (let i = 0; i < 5; i++) {
      s.motes.push({ id: 900000 + i, x: x + far, y, value: 1, droppedAt: s.time });
    }
    s.collectors.push({ id: 999999, x, y, droppedAt: s.time });

    await tick(2);

    const after = arena().state.value.stats;
    expect(after.collectorsTaken).toBe(1);
    expect(after.motesCollectedByCollector).toBeGreaterThan(0);
    expect(after.motesBanked).toBeGreaterThan(before);
    expect(arena().state.value.collectors).toHaveLength(0);
  });

  it('counts collector motes inside the banked total rather than beside it', async () => {
    arena().startRun('generalist');
    await tick(400);
    const s = arena().state.value;
    s.collectors.push({ id: 999998, x: s.operator.x, y: s.operator.y, droppedAt: s.time });
    await tick(2);
    const stats = arena().state.value.stats;
    expect(stats.motesCollectedByCollector).toBeLessThanOrEqual(stats.motesBanked);
    expect(stats.motesBanked).toBeLessThanOrEqual(stats.motesDropped);
  });
});

describe('survivor/arena — per-device accounting', () => {
  beforeEach(() => boot());

  it('attributes every kill to exactly one device', async () => {
    arena().startRun('generalist');
    await tick(600);
    const stats = arena().state.value.stats;
    const entries = Object.values(stats.devices);

    expect(entries.length).toBeGreaterThan(0);
    // Killing-blow credit, so the per-device shares the probe prints are a
    // partition of the run's kills rather than an overlapping tally.
    expect(entries.reduce((n, d) => n + d.kills, 0)).toBe(stats.kills);
    for (const d of entries) {
      expect(d.firesConnected).toBeLessThanOrEqual(d.fires);
      expect(d.hits).toBeLessThanOrEqual(d.reachable);
    }
  });
});

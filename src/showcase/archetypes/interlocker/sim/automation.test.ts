/**
 * Automation module — behavioral specs (studio/open-loop-starter#8).
 *
 * These lock WHAT the KS-patterned automation does (contracts: tier gating, the
 * trigger buffer, frontier research, the solvency floor, the active-count
 * throttle), driving the real assembled engine tick-by-tick via `sim/harness.ts`.
 * They are separate from the magnitude locks in `interlocker.probe.test.ts` —
 * behavioral assertions (counts, monotonicity, buffering) stay true across
 * retunes, so no balance numbers live here.
 *
 * Fresh engine per test (`beforeEach(boot)`): a unique persistence namespace per
 * boot isolates the profile + tier state, so a fresh boot IS the reset.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addResource, subtractResource } from '@open-loop/engine';
import { boot, tick, resources, buildings, village, sciences, automation } from './harness';
import { BUILDINGS } from '../data';
import type { BuildingId, ResourceId, ScienceId } from '../data/types';

const N = (v: unknown): number => Number(v as number);

/** Set a resource to (approximately) `amount`. Zero via `subtractResource` then
 *  `addResource` — both go through the ResourceBag link, so the value sticks
 *  across ticks (a direct `.value =` desyncs the bag and drifts). Caps clamp on
 *  add, which is fine: we seed to make things affordable/buffered, not exact. */
function seed(id: ResourceId, amount: number): void {
  const r = resources().resources[id];
  const current = N(r.value);
  if (current > 0) subtractResource(r, current);
  addResource(r, amount);
}

/** Directly research the science cascade through `target` by seeding science and
 *  purchasing in prerequisite order (each `purchase` checks prereq + cost). */
function researchThrough(target: ScienceId): void {
  const order: ScienceId[] = [
    'calendar',
    'agriculture',
    'mining',
    'metal',
    'construction',
    'architecture',
  ];
  seed('science', 100000);
  for (const id of order) {
    sciences().category.getEntry(id)?.purchasable.purchase(1);
    if (id === target) break;
  }
}

/** Disable every building's automation except the named ones (isolates a test to
 *  one building so the shared wood/catnip pool doesn't confound it). */
function onlyBuildings(...keep: BuildingId[]): void {
  for (const def of BUILDINGS) {
    automation().setBuildingField(def.id, 'enabled', keep.includes(def.id));
  }
}

describe('automation — tier gating', () => {
  beforeEach(() => boot());

  it('is inert until its tier unlocks, then acts', async () => {
    onlyBuildings('library'); // library is always visible, no solvency gate
    seed('wood', 150);
    // Manual tier only — build tier locked (no hut). Automation must not build.
    await tick(10);
    expect(buildings().buildingCount('library')).toBe(0);

    // Unlock the build tier → automation builds the library.
    automation().tierSystem.unlock('build');
    seed('wood', 150);
    await tick(10);
    expect(buildings().buildingCount('library')).toBeGreaterThan(0);
  });

  it('respects a building max', async () => {
    onlyBuildings('library');
    automation().setBuildingField('library', 'max', 2);
    automation().tierSystem.unlock('build');
    seed('wood', 200);
    await tick(20);
    expect(buildings().buildingCount('library')).toBe(2);
  });
});

describe('automation — trigger buffer (the core primitive)', () => {
  beforeEach(() => boot());

  it('withholds a purchase until the input is buffered past the trigger', async () => {
    onlyBuildings('library');
    automation().tierSystem.unlock('build');
    // High trigger: only build when wood ≥ 90% of its cap (200 → 180).
    automation().setBuildingField('library', 'trigger', 0.9);

    // Below the buffer but well above the 25-wood cost → affordability is not the
    // gate; the buffer is. Must NOT build.
    seed('wood', 100);
    await tick(5);
    expect(buildings().buildingCount('library')).toBe(0);

    // Raise wood above the buffer → now it builds.
    seed('wood', 195);
    await tick(5);
    expect(buildings().buildingCount('library')).toBeGreaterThan(0);
  });
});

describe('automation — frontier research', () => {
  beforeEach(() => boot());

  it('researches only the current frontier science, in cascade order', async () => {
    automation().tierSystem.unlock('research');
    // Enough for calendar (30) + agriculture (100) but not mining (500).
    seed('science', 140);
    await tick(5);
    expect(sciences().scienceCompleted('calendar')).toBe(true);
    expect(sciences().scienceCompleted('agriculture')).toBe(true);
    // Mining is the frontier now but unaffordable → not researched (no skipping).
    expect(sciences().scienceCompleted('mining')).toBe(false);
  });
});

describe('automation — solvency floor', () => {
  beforeEach(() => boot());

  it('hires farmers to keep the colony fed as it grows', async () => {
    for (const t of ['build', 'assign', 'research', 'craft']) automation().tierSystem.unlock(t);

    // Drive the shipping automation with manual gather/refine (the manual tier)
    // until the colony grows past the point where fields alone feed it — i.e.
    // agriculture must have unlocked farmers and the solvency floor must be
    // hiring them (a colony this size can't survive on fields).
    let reached = false;
    for (let i = 0; i < 4000; i++) {
      if (N(resources().resources.kittens.value) >= 8) {
        reached = true;
        break;
      }
      for (let g = 0; g < 10; g++) buildings().gatherCatnip();
      const catnip = resources().resources.catnip;
      const cap = N(resources().bag.remainingCapacityForType('catnip')) + N(catnip.value);
      for (let r = 0; r < 40; r++) {
        if (N(catnip.value) <= cap * 0.5 + buildings().refineCatnipCost) break;
        if (!buildings().refineCatnip()) break;
      }
      await tick(1);
    }

    expect(reached).toBe(true);
    // Agriculture unlocked farmers, and the solvency floor put kittens on them so
    // the colony didn't starve out (population sustained, farmers working).
    expect(sciences().scienceCompleted('agriculture')).toBe(true);
    expect(N(village().jobCounts.farmer.value)).toBeGreaterThan(0);
  });
});

describe('automation — smelter active-count throttle (canon `on`)', () => {
  beforeEach(() => boot());

  it('the active count gates the continuous drain', async () => {
    researchThrough('metal'); // unlocks the smelter (also auto-unlocks assign→build)
    // Disable ALL building automation — incl. the smelter — so autoBuild adds no
    // wood noise and autoThrottle won't override the manual active count below.
    onlyBuildings();
    seed('minerals', 300);
    buildings().category.getEntry('smelter')?.purchasable.purchase(1);
    expect(buildings().buildingCount('smelter')).toBe(1);

    // Paused (0 active) → no wood consumed.
    seed('wood', 120);
    seed('minerals', 200);
    buildings().setActiveCount('smelter', 0);
    const woodPaused = N(resources().resources.wood.value);
    await tick(5);
    expect(N(resources().resources.wood.value)).toBeCloseTo(woodPaused, 5);

    // Running (1 active) → wood drains.
    buildings().setActiveCount('smelter', 1);
    const woodBefore = N(resources().resources.wood.value);
    await tick(5);
    expect(N(resources().resources.wood.value)).toBeLessThan(woodBefore);
  });

  it('autoThrottle pauses smelters when wood income cannot sustain them', async () => {
    researchThrough('metal');
    onlyBuildings('smelter'); // only the smelter is automation-managed
    seed('minerals', 300);
    buildings().category.getEntry('smelter')?.purchasable.purchase(1);
    // No woodcutters assigned → zero wood income → the throttle must pause it,
    // even with wood banked, so the drain never out-paces production.
    seed('wood', 200);
    await tick(3);
    expect(buildings().activeCount('smelter')).toBe(0);
  });
});

describe('automation — profile persistence', () => {
  beforeEach(() => boot());

  it('a setter edit reassigns the persisted profile', () => {
    automation().setBuildingField('smelter', 'max', 2);
    expect(automation().profile.value.buildings.smelter.max).toBe(2);
    automation().setBuildingField('smelter', 'enabled', false);
    expect(automation().profile.value.buildings.smelter.enabled).toBe(false);
    automation().setCraftField('beam', 'trigger', 0.75);
    expect(automation().profile.value.crafts.beam.trigger).toBeCloseTo(0.75, 5);
  });
});

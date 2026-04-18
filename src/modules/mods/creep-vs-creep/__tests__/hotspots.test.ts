/**
 * Hotspot producer + reservoir tests (OL-510).
 *
 * Validates the three OL-504 "validates" bullets that land in this ticket:
 *   - Producer category wires owned hotspots into the owning faction's resource.
 *   - Depleting-on-use reservoir shrinks proportional to extracted yield.
 *   - Slow regen pushes the reservoir back toward capacity when nothing is
 *     draining it.
 *
 * The engine's `_resetAllPersistentContexts` isn't exported, and
 * {@link createHotspotSystem} registers persistent scopes under
 * `creep-warfare-hotspots/{faction}-{hotspotId}`. Sharing one hotspot system
 * across tests (beforeAll build, reset state in beforeEach) side-steps the
 * collision — same pattern as goals.test.ts / ai.test.ts.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createModifierChain,
  createMultiplicativeModifier,
  createResource,
  createSpatialGrid,
  type DecimalSource,
  type ModifierChain,
  type Resource,
  type SpatialGrid,
} from 'open-loop-engine';
import { createHotspotSystem, type HotspotSystem } from '../hotspots';
import {
  FACTION_IDS,
  HOTSPOT_REGEN_PER_SEC,
  MAP_HEIGHT,
  MAP_WIDTH,
  type CellState,
  type FactionId,
  type HotspotDef,
} from '../content';

const HOTSPOTS: HotspotDef[] = [
  { id: 'hs-a', x: 10, y: 10, baseYield: 1, capacity: 100 },
  { id: 'hs-b', x: 40, y: 40, baseYield: 1, capacity: 100 },
];

function makeGrid(): SpatialGrid<CellState> {
  const grid = createSpatialGrid<CellState>({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    initializer: () => ({ terrain: 'open', owner: null, hp: 0, reservoir: 0 }),
  });
  for (let i = 0; i < grid.passable.length; i++) grid.passable[i] = 1;
  for (const h of HOTSPOTS) {
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });
  }
  return grid;
}

function makeEssence(): Record<FactionId, Resource<DecimalSource>> {
  const out = {} as Record<FactionId, Resource<DecimalSource>>;
  for (const f of FACTION_IDS) out[f] = createResource<DecimalSource>(0);
  return out;
}

function makeYieldChains(): Record<FactionId, ModifierChain> {
  const out = {} as Record<FactionId, ModifierChain>;
  for (const f of FACTION_IDS) out[f] = createModifierChain(`hotspots-test/${f}/yield`);
  return out;
}

describe('hotspot producers + reservoir', () => {
  let grid: SpatialGrid<CellState>;
  let essence: Record<FactionId, Resource<DecimalSource>>;
  let yieldChains: Record<FactionId, ModifierChain>;
  let hotspots: HotspotSystem;
  const tick = (dt: number): void => hotspots.onEngineTick(dt);

  beforeAll(() => {
    grid = makeGrid();
    essence = makeEssence();
    yieldChains = makeYieldChains();
    hotspots = createHotspotSystem({
      grid,
      hotspots: HOTSPOTS,
      essence,
      yieldChains,
    });
  });

  beforeEach(() => {
    for (const h of HOTSPOTS) {
      grid.set(h.x, h.y, {
        terrain: 'hotspot',
        owner: null,
        hp: 0,
        hotspotId: h.id,
        reservoir: h.capacity,
      });
    }
    for (const f of FACTION_IDS) essence[f].value = 0;
  });

  it('unowned hotspots deposit nothing; reservoir holds at capacity', () => {
    tick(5);
    for (const f of FACTION_IDS) {
      expect(Number(essence[f].value)).toBe(0);
    }
    for (const h of HOTSPOTS) {
      expect(Number(hotspots.reservoirOf(h.id))).toBeCloseTo(h.capacity);
    }
  });

  it('owned hotspot deposits to the owner only', () => {
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: 'red',
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });

    tick(1);

    expect(Number(essence.red.value)).toBeGreaterThan(0);
    for (const f of FACTION_IDS) {
      if (f !== 'red') expect(Number(essence[f].value)).toBe(0);
    }
  });

  it('reservoir depletes proportional to extraction', () => {
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: 'red',
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });

    const before = Number(hotspots.reservoirOf(h.id));
    tick(1);
    const after = Number(hotspots.reservoirOf(h.id));
    expect(after).toBeLessThan(before);

    // Net change per tick: regen − extraction. At full reservoir the owner
    // extracts baseYield × 1 (reservoirFactor=1) × dt, and regen is
    // capacity × HOTSPOT_REGEN_PER_SEC × dt. The gap must match within
    // Decimal-float tolerance.
    const expectedDelta =
      Number(h.baseYield) - Number(h.capacity) * HOTSPOT_REGEN_PER_SEC;
    expect(before - after).toBeCloseTo(expectedDelta, 4);
  });

  it('unowned hotspot reservoir regenerates toward capacity', () => {
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: h.id,
      reservoir: 10,
    });

    tick(60);

    const after = Number(hotspots.reservoirOf(h.id));
    expect(after).toBeGreaterThan(10);
    expect(after).toBeLessThanOrEqual(h.capacity);
  });

  it('regen clamps at capacity', () => {
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });

    tick(600);

    expect(Number(hotspots.reservoirOf(h.id))).toBeCloseTo(h.capacity);
  });

  it('yield chain upgrade amplifies deposits into essence', () => {
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: 'red',
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });

    tick(1);
    const baseline = Number(essence.red.value);

    // Reset and retry with a 2× yield modifier on the red chain.
    grid.set(h.x, h.y, {
      terrain: 'hotspot',
      owner: 'red',
      hp: 0,
      hotspotId: h.id,
      reservoir: h.capacity,
    });
    essence.red.value = 0;
    const remove = yieldChains.red.add(
      createMultiplicativeModifier({ multiplier: 2, description: 'test-2x' }),
    );

    tick(1);
    const boosted = Number(essence.red.value);
    remove();

    expect(boosted).toBeGreaterThan(baseline);
    expect(boosted).toBeCloseTo(baseline * 2, 3);
  });
});

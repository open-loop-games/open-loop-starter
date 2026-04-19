/**
 * Goal-slot system tests (OL-508, revised OL-509).
 *
 * Validates the slot ↔ PersistentEffectSystem bridge: selecting a goal
 * installs a modifier on the routed chain, deselecting removes it,
 * swapping routes across chains, capacity gates selection, completion
 * predicates auto-drop the multiplier, and `sweepCompleted` frees slots.
 *
 * The engine's `_resetAllPersistentContexts` isn't re-exported, and each
 * `createGoalSystem` call registers a `persistent(..., { name: 'selected' })`
 * per faction. Re-invoking the factory in the same process collides on
 * those names. Workaround: build one shared goal system in `beforeAll`,
 * reset selections + grid state in `beforeEach`.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import {
  createModifierChain,
  createPersistentEffectSystem,
  createSpatialGrid,
  type ModifierChain,
  type SpatialGrid,
} from 'open-loop-engine';
import { createGoalSystem, type GoalChains, type GoalSystem } from '../goals';
import {
  FACTION_IDS,
  type CellState,
  type FactionId,
  type HotspotDef,
} from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();
const MAP_WIDTH = vars.archetype.mapWidth;
const MAP_HEIGHT = vars.archetype.mapHeight;

function makeChains(namespace: string): GoalChains {
  const build = (kind: string): Record<FactionId, ModifierChain> => {
    const out = {} as Record<FactionId, ModifierChain>;
    for (const f of FACTION_IDS) {
      out[f] = createModifierChain(`${namespace}/${f}/${kind}`);
    }
    return out;
  };
  return { attack: build('attack'), defense: build('defense'), spread: build('spread') };
}

/**
 * 13-hotspot fixture mirroring MAP.md §§ 4 + 5: per-quadrant near + natural,
 * axis-aligned contested, single centre. Coordinates are illustrative — the
 * goal system reads tier and id, not geometry.
 */
const HOTSPOTS: HotspotDef[] = [
  // near (faction-owned at gen time in real play; tests pre-clear the grid)
  { id: 'hs-near-nw', x: 8, y: 8, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-ne', x: 91, y: 8, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-se', x: 91, y: 91, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-sw', x: 8, y: 91, baseYield: 1, capacity: 100, tier: 'near' },
  // natural
  { id: 'hs-natural-nw', x: 22, y: 22, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-ne', x: 77, y: 22, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-se', x: 77, y: 77, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-sw', x: 22, y: 77, baseYield: 1, capacity: 100, tier: 'natural' },
  // contested (axis-aligned, shared by 2 adjacent factions)
  { id: 'hs-contested-n', x: 50, y: 22, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-e', x: 77, y: 50, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-s', x: 50, y: 77, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-w', x: 22, y: 50, baseYield: 1, capacity: 100, tier: 'contested' },
  // centre
  { id: 'hs-center', x: 50, y: 50, baseYield: 1, capacity: 100, tier: 'center' },
];

function makeTestGrid(): SpatialGrid<CellState> {
  return createSpatialGrid<CellState>({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    initializer: () => ({ terrain: 'open', owner: null, hp: 0, reservoir: 0 }),
  });
}

function resetGrid(grid: SpatialGrid<CellState>): void {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      grid.set(x, y, { terrain: 'open', owner: null, hp: 0, reservoir: 0 });
    }
  }
}

describe('goal-slot system', () => {
  let goals: GoalSystem;
  let chains: GoalChains;
  let grid: SpatialGrid<CellState>;

  beforeAll(() => {
    chains = makeChains('test-goals');
    grid = makeTestGrid();
    const pes = createPersistentEffectSystem({ id: 'test-goal-effects' });
    goals = createGoalSystem({
      pes,
      chains,
      hotspots: HOTSPOTS,
      grid,
      startingGoalSlots: vars.archetype.startingGoalSlots,
      goalMultiplier: vars.balance.goalMultiplier,
    });
  });

  beforeEach(async () => {
    for (const f of FACTION_IDS) goals.slots[f].deselectAll();
    goals.capacity.value = 1;
    resetGrid(grid);
    // PES's `watch` is post-flush; wait for pending binding-removal callbacks
    // from the previous test to land before the next test starts.
    await nextTick();
  });

  it('selecting a claim goal applies a 1.5× modifier on the spread chain', async () => {
    const spreadRed = chains.spread.red;
    expect(Number(spreadRed.apply(10))).toBe(10);

    expect(goals.slots.red.select('claim:hotspot-hs-near-nw')).toBe(true);
    await nextTick();
    expect(Number(spreadRed.apply(10))).toBeCloseTo(15);
  });

  it('deselecting releases the modifier', async () => {
    goals.slots.red.select('claim:hotspot-hs-near-nw');
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);

    expect(goals.slots.red.deselect('claim:hotspot-hs-near-nw')).toBe(true);
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBe(10);
  });

  it('defend and pressure goals route to defense and attack respectively', async () => {
    goals.capacity.value = 3;
    // Seed defender-faction cells in the NW quadrant with adversaries so
    // `defend:sector-nw` doesn't read as already-completed.
    grid.set(5, 5, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
    grid.set(6, 5, { terrain: 'open', owner: 'blue', hp: 0, reservoir: 0 });
    // And ensure blue has more territory than red so `pressure:faction-blue`
    // isn't trivially completed (blue's territory must exceed red's).
    grid.set(40, 40, { terrain: 'open', owner: 'blue', hp: 0, reservoir: 0 });
    grid.set(41, 40, { terrain: 'open', owner: 'blue', hp: 0, reservoir: 0 });

    goals.slots.red.select('defend:sector-nw');
    goals.slots.red.select('pressure:faction-blue');
    goals.slots.red.select('claim:hotspot-hs-center');
    await nextTick();

    expect(Number(chains.defense.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.attack.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
  });

  it('two factions can pick the same goal id without collision', async () => {
    goals.slots.red.select('claim:hotspot-hs-near-nw');
    goals.slots.blue.select('claim:hotspot-hs-near-nw');
    await nextTick();

    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.spread.blue.apply(10))).toBeCloseTo(15);
  });

  it('capacity 1 rejects a second selection', async () => {
    expect(goals.capacity.value).toBe(1);
    expect(goals.slots.red.select('claim:hotspot-hs-near-nw')).toBe(true);
    expect(goals.slots.red.select('defend:sector-nw')).toBe(false);
    await nextTick();

    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.defense.red.apply(10))).toBe(10);
  });

  it('increasing capacity admits a previously-rejected selection', async () => {
    // Seed a threat so defend:sector-nw isn't already completed.
    grid.set(5, 5, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
    grid.set(6, 5, { terrain: 'open', owner: 'blue', hp: 0, reservoir: 0 });

    goals.slots.red.select('claim:hotspot-hs-near-nw');
    expect(goals.slots.red.select('defend:sector-nw')).toBe(false);

    goals.capacity.value = 2;
    expect(goals.slots.red.select('defend:sector-nw')).toBe(true);
    await nextTick();
    expect(Number(chains.defense.red.apply(10))).toBeCloseTo(15);
  });

  it('pool rejects pressure:faction-<self>', () => {
    const pool = goals.goalPoolFor('red');
    expect(pool).not.toContain('pressure:faction-red');
    expect(pool).toContain('pressure:faction-blue');
    expect(goals.slots.red.select('pressure:faction-red')).toBe(false);
  });

  it('pool surfaces the full 13-hotspot + 4-sector + 3-pressure id set', () => {
    // OL-609: 13 claim:hotspot-* (4 near + 4 natural + 4 contested + 1 centre)
    // + 4 defend:sector-* + 3 pressure:faction-* (excluding self) = 20.
    const pool = goals.goalPoolFor('red');
    const claims = pool.filter((g) => g.startsWith('claim:hotspot-'));
    const defends = pool.filter((g) => g.startsWith('defend:sector-'));
    const pressures = pool.filter((g) => g.startsWith('pressure:faction-'));
    expect(claims).toHaveLength(13);
    expect(defends).toHaveLength(4);
    expect(pressures).toHaveLength(3);
    // Every hotspot id is represented exactly once.
    expect(new Set(claims).size).toBe(13);
    for (const h of HOTSPOTS) {
      expect(claims).toContain(`claim:hotspot-${h.id}`);
    }
  });

  it("claim goal's modifier drops after sweep when the selecting faction owns the hotspot", async () => {
    goals.slots.red.select('claim:hotspot-hs-near-nw');
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);

    // Self-ownership is what completes the claim — see goals.ts isGoalCompleted.
    // SpatialGrid reads are non-reactive; the completion predicate only
    // re-evaluates when something reactive in its dependencies changes, so
    // we drive that via `sweepCompleted` which deselects the stale goal.
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: 'red', hp: 0, hotspotId: h.id, reservoir: 0 });
    expect(goals.isGoalCompleted('red', 'claim:hotspot-hs-near-nw')).toBe(true);

    goals.sweepCompleted();
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBe(10);
  });

  it('claim goal stays uncompleted when an enemy faction owns the hotspot', () => {
    // OL-609: near-hotspots start faction-owned at gen time. Claim goals on
    // enemy-held hotspots must remain pursuable so expansion-via-conquest
    // is reachable; the predicate keys on self-ownership, not "any owner".
    const h = HOTSPOTS[0]; // hs-near-nw
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: 'blue', hp: 0, hotspotId: h.id, reservoir: 0 });
    expect(goals.isGoalCompleted('red', 'claim:hotspot-hs-near-nw')).toBe(false);
    expect(goals.isGoalCompleted('blue', 'claim:hotspot-hs-near-nw')).toBe(true);
  });

  it('sweepCompleted deselects goals whose predicate is true', () => {
    goals.slots.red.select('claim:hotspot-hs-near-nw');
    expect(goals.slots.red.selected.value).toContain('claim:hotspot-hs-near-nw');

    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: 'red', hp: 0, hotspotId: h.id, reservoir: 0 });

    goals.sweepCompleted();
    expect(goals.slots.red.selected.value).not.toContain('claim:hotspot-hs-near-nw');
  });

  it('restoring slot selections reapplies modifiers implicitly via PES', async () => {
    goals.slots.red.restore(['claim:hotspot-hs-center']);
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
  });
});

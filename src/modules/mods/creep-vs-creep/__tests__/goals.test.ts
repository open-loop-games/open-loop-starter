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

const HOTSPOTS: HotspotDef[] = [
  { id: 'hs-nw', x: 18, y: 18, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-mid', x: 30, y: 30, baseYield: 1, capacity: 100, tier: 'center' },
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

    expect(goals.slots.red.select('claim:hotspot-hs-nw')).toBe(true);
    await nextTick();
    expect(Number(spreadRed.apply(10))).toBeCloseTo(15);
  });

  it('deselecting releases the modifier', async () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);

    expect(goals.slots.red.deselect('claim:hotspot-hs-nw')).toBe(true);
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
    goals.slots.red.select('claim:hotspot-hs-mid');
    await nextTick();

    expect(Number(chains.defense.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.attack.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
  });

  it('two factions can pick the same goal id without collision', async () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    goals.slots.blue.select('claim:hotspot-hs-nw');
    await nextTick();

    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.spread.blue.apply(10))).toBeCloseTo(15);
  });

  it('capacity 1 rejects a second selection', async () => {
    expect(goals.capacity.value).toBe(1);
    expect(goals.slots.red.select('claim:hotspot-hs-nw')).toBe(true);
    expect(goals.slots.red.select('defend:sector-nw')).toBe(false);
    await nextTick();

    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
    expect(Number(chains.defense.red.apply(10))).toBe(10);
  });

  it('increasing capacity admits a previously-rejected selection', async () => {
    // Seed a threat so defend:sector-nw isn't already completed.
    grid.set(5, 5, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
    grid.set(6, 5, { terrain: 'open', owner: 'blue', hp: 0, reservoir: 0 });

    goals.slots.red.select('claim:hotspot-hs-nw');
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

  it("claim goal's modifier drops after sweep when the hotspot gains an owner", async () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);

    // Any owner completes the goal — the opportunity is gone either way.
    // SpatialGrid reads are non-reactive; the completion predicate only
    // re-evaluates when something reactive in its dependencies changes, so
    // we drive that via `sweepCompleted` which deselects the stale goal.
    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: 'blue', hp: 0, hotspotId: h.id, reservoir: 0 });
    expect(goals.isGoalCompleted('red', 'claim:hotspot-hs-nw')).toBe(true);

    goals.sweepCompleted();
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBe(10);
  });

  it('sweepCompleted deselects goals whose predicate is true', () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    expect(goals.slots.red.selected.value).toContain('claim:hotspot-hs-nw');

    const h = HOTSPOTS[0];
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: 'red', hp: 0, hotspotId: h.id, reservoir: 0 });

    goals.sweepCompleted();
    expect(goals.slots.red.selected.value).not.toContain('claim:hotspot-hs-nw');
  });

  it('restoring slot selections reapplies modifiers implicitly via PES', async () => {
    goals.slots.red.restore(['claim:hotspot-hs-mid']);
    await nextTick();
    expect(Number(chains.spread.red.apply(10))).toBeCloseTo(15);
  });
});

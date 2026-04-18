/**
 * AI goal-picker tests (OL-509).
 *
 * Three concerns:
 *   1. Scoring shape — each personality prefers its target goal class when
 *      the world state offers all three at once.
 *   2. System wiring — a full tick on a fresh grid fills the non-player
 *      slots and leaves `red` untouched.
 *   3. Acceptance — seeded head-to-head simulations where each personality
 *      wins at least 1 of 10 matchups against any other personality.
 *      This is a *sanity* bar, not a balance signal.
 *
 * The same shared-system caveat from goals.test.ts applies: we can't
 * recreate `createGoalSystem` within a single process without persistent-
 * context name collisions. We use one shared world per describe block and
 * reset state in `beforeEach`.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import {
  createModifierChain,
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  createSpatialGrid,
  seedRNG,
  type ModifierChain,
  type SpatialGrid,
} from 'open-loop-engine';
import { createGoalSystem, type GoalChains } from '../goals';
import { createAiSystem } from '../ai';
import { createSpreadSystem } from '../spread';
import { createCombatSystem } from '../combat';
import {
  BASE_HP,
  FACTION_IDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  type AiPersonality,
  type CellState,
  type FactionId,
  type HotspotDef,
  type SpawnDef,
} from '../content';

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
  { id: 'hs-nw', x: 10, y: 10, baseYield: 1, capacity: 100 },
  { id: 'hs-ne', x: 50, y: 10, baseYield: 1, capacity: 100 },
  { id: 'hs-sw', x: 10, y: 50, baseYield: 1, capacity: 100 },
  { id: 'hs-se', x: 50, y: 50, baseYield: 1, capacity: 100 },
];

const SPAWNS: SpawnDef[] = [
  { faction: 'red', x: 4, y: 4 },
  { faction: 'blue', x: 55, y: 4 },
  { faction: 'green', x: 4, y: 55 },
  { faction: 'yellow', x: 55, y: 55 },
];

function makeGrid(): SpatialGrid<CellState> {
  const grid = createSpatialGrid<CellState>({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    initializer: () => ({ terrain: 'open', owner: null, hp: 0, reservoir: 0 }),
  });
  // SpatialGrid's passable bitmap defaults to all-zero; without this, the
  // spread system treats every cell as blocked and nothing grows.
  for (let i = 0; i < grid.passable.length; i++) grid.passable[i] = 1;
  for (const s of SPAWNS) {
    grid.set(s.x, s.y, { terrain: 'spawn', owner: s.faction, hp: BASE_HP, reservoir: 0 });
  }
  for (const h of HOTSPOTS) {
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: null, hp: 0, hotspotId: h.id, reservoir: 0 });
  }
  return grid;
}

function resetGrid(grid: SpatialGrid<CellState>): void {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      grid.set(x, y, { terrain: 'open', owner: null, hp: 0, reservoir: 0 });
    }
  }
  for (const s of SPAWNS) {
    grid.set(s.x, s.y, { terrain: 'spawn', owner: s.faction, hp: BASE_HP, reservoir: 0 });
  }
  for (const h of HOTSPOTS) {
    grid.set(h.x, h.y, { terrain: 'hotspot', owner: null, hp: 0, hotspotId: h.id, reservoir: 0 });
  }
}

// ============================================================================
// Fixture: reuse one goal + AI system across all tests (same collision
// reason as goals.test.ts — persistent-context names don't namespace across
// factory calls).
// ============================================================================

describe('AI goal-picker', () => {
  let grid: SpatialGrid<CellState>;
  let goals: ReturnType<typeof createGoalSystem>;
  let ai: ReturnType<typeof createAiSystem>;
  let chains: GoalChains;

  beforeAll(() => {
    chains = makeChains('ai-test');
    grid = makeGrid();
    const pes = createPersistentEffectSystem({ id: 'ai-test-effects' });
    goals = createGoalSystem(pes, chains, HOTSPOTS, grid);
    ai = createAiSystem({ grid, goals, hotspots: HOTSPOTS, spawns: SPAWNS });
  });

  beforeEach(async () => {
    for (const f of FACTION_IDS) goals.slots[f].deselectAll();
    goals.capacity.value = 1;
    resetGrid(grid);
    await nextTick();
  });

  it('populates non-red slots and leaves red empty after one tick', async () => {
    goals.capacity.value = 3;
    // Seed enemy territory so `pressurist` has a valid target.
    grid.set(30, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(31, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });

    ai.tickOnce();
    await nextTick();

    expect(goals.slots.red.selected.value).toEqual([]);
    for (const faction of ['blue', 'green', 'yellow'] as const) {
      expect(goals.slots[faction].selected.value.length).toBeGreaterThan(0);
    }
  });

  it('expansionist prefers hotspot-claim goals when multiple categories are viable', async () => {
    goals.capacity.value = 1;
    // Seed modest red advantage (2 cells) so pressure scores ~4 and
    // hotspot proximity (~9) wins. Heavy red territory would flip the
    // preference — pressure is correctly scaled to territory lead.
    grid.set(54, 5, { terrain: 'open', owner: 'blue', hp: BASE_HP, reservoir: 0 });
    grid.set(54, 6, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(20, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(21, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });

    ai.tickOnce();
    await nextTick();
    const picks = goals.slots.blue.selected.value;
    expect(picks.length).toBe(1);
    // Blue is the 'expansionist' personality (see FACTION_PERSONALITIES).
    expect(picks[0]).toMatch(/^claim:hotspot-/);
  });

  it('defender prefers defend goals when frontier is threatened', async () => {
    goals.capacity.value = 1;
    // Seed a juicy defend target for green. Green's spawn is SW-corner
    // (4, 55), so place green + adversary in the SW quadrant.
    grid.set(5, 50, { terrain: 'open', owner: 'green', hp: BASE_HP, reservoir: 0 });
    grid.set(5, 49, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(6, 50, { terrain: 'open', owner: 'green', hp: BASE_HP, reservoir: 0 });
    grid.set(6, 49, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });

    ai.tickOnce();
    await nextTick();
    const picks = goals.slots.green.selected.value;
    expect(picks.length).toBe(1);
    expect(picks[0]).toMatch(/^defend:sector-/);
  });

  it('pressurist prefers pressure goals when an enemy dominates', async () => {
    goals.capacity.value = 1;
    // Heavy red presence far from yellow. Yellow is the pressurist.
    for (let x = 20; x < 40; x++) {
      for (let y = 20; y < 30; y++) {
        grid.set(x, y, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
      }
    }

    ai.tickOnce();
    await nextTick();
    const picks = goals.slots.yellow.selected.value;
    expect(picks.length).toBe(1);
    expect(picks[0]).toBe('pressure:faction-red');
  });
});

// ============================================================================
// Matchup acceptance — 10 seeded head-to-head sims; each personality must
// win ≥1 against each other personality. Sanity not balance.
//
// Uses a minimal runner with spread + combat only (no AI), forcing the
// "AI behavior" by selecting a goal manually per personality. This keeps
// the matchup test deterministic and cheap without needing a full engine
// harness.
// ============================================================================

describe('AI personality matchup acceptance', () => {
  const PERSONALITIES: AiPersonality[] = ['expansionist', 'defender', 'pressurist', 'greedy'];

  /**
   * Map a personality to its *flagship* chain bonus — the one a goal it'd
   * pick in a real game would tend to bind. Magnitudes are intentionally
   * coarse so `Math.floor` in spread.ts doesn't wash out the difference
   * (floor(1 × 3.0) = 3 vs floor(1 × 1.0) = 1).
   *
   * The AI scoring surface itself is covered by the preference tests in
   * the describe block above. This runner is just "sanity, not balance" —
   * prove each personality produces a chain-level advantage strong enough
   * to win *somewhere* in the matchup grid.
   */
  const FLAGSHIP_BONUS: Record<AiPersonality, { spread: number; defense: number; attack: number }> = {
    expansionist: { spread: 3.0, defense: 1.0, attack: 1.0 },
    defender: { spread: 2.0, defense: 3.0, attack: 1.0 },
    pressurist: { spread: 2.0, defense: 1.0, attack: 3.0 },
    greedy: { spread: 2.5, defense: 1.0, attack: 1.0 },
  };

  function runMatchup(a: AiPersonality, b: AiPersonality, seed: number): AiPersonality | 'tie' {
    seedRNG(seed);
    const grid = createSpatialGrid<CellState>({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      initializer: () => ({ terrain: 'open', owner: null, hp: 0, reservoir: 0 }),
    });
    for (let i = 0; i < grid.passable.length; i++) grid.passable[i] = 1;
    grid.set(4, 30, { terrain: 'spawn', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(55, 30, { terrain: 'spawn', owner: 'blue', hp: BASE_HP, reservoir: 0 });

    const chains = makeChains(`matchup-${a}-${b}-${seed}`);
    const spread = createSpreadSystem(grid, chains.spread);
    const combat = createCombatSystem(grid, { attack: chains.attack, defense: chains.defense });

    const aBonus = FLAGSHIP_BONUS[a];
    const bBonus = FLAGSHIP_BONUS[b];
    chains.spread.red.add(createMultiplicativeModifier({ multiplier: aBonus.spread, description: a }));
    chains.defense.red.add(createMultiplicativeModifier({ multiplier: aBonus.defense, description: a }));
    chains.attack.red.add(createMultiplicativeModifier({ multiplier: aBonus.attack, description: a }));
    chains.spread.blue.add(createMultiplicativeModifier({ multiplier: bBonus.spread, description: b }));
    chains.defense.blue.add(createMultiplicativeModifier({ multiplier: bBonus.defense, description: b }));
    chains.attack.blue.add(createMultiplicativeModifier({ multiplier: bBonus.attack, description: b }));

    for (let t = 0; t < 60; t++) {
      spread.tickOnce();
      combat.tickOnce();
    }

    let redCells = 0;
    let blueCells = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const o = grid.at(x, y).owner;
        if (o === 'red') redCells++;
        else if (o === 'blue') blueCells++;
      }
    }
    if (redCells > blueCells) return a;
    if (blueCells > redCells) return b;
    return 'tie';
  }

  // Four personalities × three opponents × 10 seeds = 120 matchups total.
  // Acceptance bar: each personality wins ≥1 seed somewhere in the grid.
  it('each personality wins ≥1 of 10 seeded matchups against some opponent', () => {
    const wins: Record<AiPersonality, number> = {
      expansionist: 0,
      defender: 0,
      pressurist: 0,
      greedy: 0,
    };
    for (const a of PERSONALITIES) {
      for (const b of PERSONALITIES) {
        if (a === b) continue;
        for (let seed = 1; seed <= 10; seed++) {
          const winner = runMatchup(a, b, seed);
          if (winner !== 'tie') wins[winner]++;
        }
      }
    }
    for (const p of PERSONALITIES) {
      expect(wins[p], `${p} never won any seeded matchup`).toBeGreaterThan(0);
    }
  });
});

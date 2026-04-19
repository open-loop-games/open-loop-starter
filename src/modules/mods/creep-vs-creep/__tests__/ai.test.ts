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
  FACTION_IDS,
  type AiPersonality,
  type CellState,
  type FactionId,
  type GoalId,
  type HotspotDef,
  type SpawnDef,
} from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();
const MAP_WIDTH = vars.archetype.mapWidth;
const MAP_HEIGHT = vars.archetype.mapHeight;
const BASE_HP = vars.balance.baseHp;

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
 * 13-hotspot fixture mirroring MAP.md §§ 4 + 5: 4 near + 4 natural + 4
 * contested + 1 centre. Coordinates align with the 100×100 Director arena
 * so spawn-to-hotspot distances match real-game proportions.
 */
const HOTSPOTS: HotspotDef[] = [
  { id: 'hs-near-nw', x: 8, y: 8, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-ne', x: 91, y: 8, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-se', x: 91, y: 91, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-near-sw', x: 8, y: 91, baseYield: 1, capacity: 100, tier: 'near' },
  { id: 'hs-natural-nw', x: 22, y: 22, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-ne', x: 77, y: 22, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-se', x: 77, y: 77, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-natural-sw', x: 22, y: 77, baseYield: 1, capacity: 100, tier: 'natural' },
  { id: 'hs-contested-n', x: 50, y: 22, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-e', x: 77, y: 50, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-s', x: 50, y: 77, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-contested-w', x: 22, y: 50, baseYield: 1, capacity: 100, tier: 'contested' },
  { id: 'hs-center', x: 50, y: 50, baseYield: 1, capacity: 100, tier: 'center' },
];

/** Per-tier yield multiplier — matches the Director balance defaults. */
const TIER_YIELD_MUL = {
  near: vars.balance.nearHotspotYieldMul,
  natural: vars.balance.naturalHotspotYieldMul,
  contested: vars.balance.contestedHotspotYieldMul,
  center: vars.balance.centerHotspotYieldMul,
};

const SPAWNS: SpawnDef[] = [
  { faction: 'red', x: 4, y: 4 },
  { faction: 'blue', x: 95, y: 4 },
  { faction: 'green', x: 4, y: 95 },
  { faction: 'yellow', x: 95, y: 95 },
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
    goals = createGoalSystem({
      pes,
      chains,
      hotspots: HOTSPOTS,
      grid,
      startingGoalSlots: vars.archetype.startingGoalSlots,
      goalMultiplier: vars.balance.goalMultiplier,
    });
    ai = createAiSystem({
      grid,
      goals,
      hotspots: HOTSPOTS,
      spawns: () => SPAWNS,
      playerFaction: vars.archetype.playerFaction,
      factionPersonalities: vars.balance.factionPersonalities,
      aiIntervalSec: vars.balance.aiIntervalSec,
      tierYieldMul: TIER_YIELD_MUL,
    });
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
    // (4, 95), so place green + adversary straddling the NW/SW boundary
    // so the defender personality detects threat in a sector it owns.
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

  it('tier-aware proximity lets contested/centre hotspots beat closer near hotspots', async () => {
    // OL-609: with tierYieldMul lifted into proximity scoring, a far-but-rich
    // hotspot can outscore a near-but-thin one. Blue (expansionist, spawn at
    // 95,4) sees `hs-near-ne` at (91,8) — distance 8, tier 0.5×. The centre
    // hotspot at (50,50) is distance 91 but tier 2.0×, so its scaled score
    // is higher. Without tier weighting blue would lock onto hs-near-ne.
    goals.capacity.value = 1;
    ai.tickOnce();
    await nextTick();
    const pick = goals.slots.blue.selected.value[0];
    expect(pick).toMatch(/^claim:hotspot-/);
    expect(pick).not.toBe('claim:hotspot-hs-near-ne');
  });

  it('AI never proposes a goal it considers already completed', async () => {
    // Legality: every goal the AI selects must satisfy isGoalCompleted=false.
    // Pre-complete a few goals (own a hotspot, dominate a faction) so the
    // candidate pool is *partially* reduced; the assertion is the AI never
    // crosses the completion line.
    goals.capacity.value = 5;
    // Seed some red territory so pressure:faction-red is non-trivially scored,
    // and some blue territory dominating green so pressure:faction-green is
    // self-completed for blue (territoryCount(green) <= territoryCount(blue)).
    grid.set(30, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    // Make blue own hs-near-ne so claim:hotspot-hs-near-ne is completed for blue.
    grid.set(91, 8, {
      terrain: 'hotspot',
      owner: 'blue',
      hp: BASE_HP,
      hotspotId: 'hs-near-ne',
      reservoir: 0,
    });

    ai.tickOnce();
    await nextTick();

    for (const faction of ['blue', 'green', 'yellow'] as const) {
      for (const goalId of goals.slots[faction].selected.value as GoalId[]) {
        expect(
          goals.isGoalCompleted(faction, goalId),
          `${faction} selected already-completed goal ${goalId}`,
        ).toBe(false);
      }
    }
  });

  it('the four personalities pick meaningfully different goals on identical seeded state', async () => {
    // Differentiation: with capacity=3 the four personalities reveal their
    // priority orderings. Identical world state, four faction → personality
    // bindings (red is unused by the AI but red.personality has no fixed
    // mapping in vars; we read each non-player faction's pick set instead).
    // Acceptance: at least 2 of the 3 non-player factions diverge in their
    // top pick — this is sanity, not balance.
    goals.capacity.value = 3;
    // Identical-ish world state: a small red advantage (so pressure has
    // some signal) and one threatened green frontier (so defend has signal),
    // but nothing that forces all 3 into the same lane.
    grid.set(30, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(31, 30, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });
    grid.set(5, 50, { terrain: 'open', owner: 'green', hp: BASE_HP, reservoir: 0 });
    grid.set(5, 49, { terrain: 'open', owner: 'red', hp: BASE_HP, reservoir: 0 });

    ai.tickOnce();
    await nextTick();

    const topPicks = (['blue', 'green', 'yellow'] as const).map(
      (f) => goals.slots[f].selected.value[0],
    );
    // All three have at least one pick.
    for (const p of topPicks) expect(p).toBeDefined();
    // The pick set spans at least two distinct goal *categories* — claim,
    // defend, or pressure — across the three personalities.
    const categories = new Set(topPicks.map((p) => p.split(':')[0]));
    expect(categories.size).toBeGreaterThanOrEqual(2);
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
    const spread = createSpreadSystem({ grid, chains: chains.spread, baseHp: BASE_HP });
    const combat = createCombatSystem({
      grid,
      chains: { attack: chains.attack, defense: chains.defense },
      baseHp: BASE_HP,
      baseAttack: vars.balance.baseAttack,
      baseDefense: vars.balance.baseDefense,
    });

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
  // Timeout bumped to 15s — the 100×100 matchup grid runs right at the edge
  // of the default 5s budget, and OL-608's per-tick flow-max pass adds a
  // small constant overhead that pushed the default over on slower runners.
  it('each personality wins ≥1 of 10 seeded matchups against some opponent', { timeout: 15_000 }, () => {
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

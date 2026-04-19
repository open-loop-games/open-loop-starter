/**
 * Territorial achievements tests (OL-528).
 *
 * Two achievement categories by reactivity shape:
 *   - Active-play (first-quarter, total-dominance) — tick-driven refs that
 *     onEngineTick writes.
 *   - Round-end (landslide, sole-survivor, blitzkrieg) — read round.stats +
 *     round.phase, set by round.endRound().
 *
 * Tests are ordered and share one achievement system (persistent-context
 * collision workaround per creep-vs-creep sibling test files). Earned state
 * is monotonic, so later tests can't un-earn what earlier ones set, and the
 * condition checks are independent across the five defs.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import {
  createModifierChain,
  createPersistentEffectSystem,
  createResource,
  withPersistentContext,
  type DecimalSource,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import { createCreepGrid, type CreepGrid } from '../grid';
import { createGoalSystem } from '../goals';
import { createUpgradeSystem, type UpgradeSystem } from '../upgrades';
import { createRoundSystem, type RoundSystem } from '../round';
import { createAchievementSystem, type AchievementSystem } from '../achievements';
import {
  FACTION_IDS,
  UPGRADE_DEFS,
  type FactionId,
} from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();
const MAP_WIDTH = vars.archetype.mapWidth;
const MAP_HEIGHT = vars.archetype.mapHeight;
const BASE_HP = vars.balance.baseHp;
const PLAYER_FACTION = vars.archetype.playerFaction;
const FACTION_ESSENCE_NAMES = vars.theme.factionEssenceNames;

interface AllChains {
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
  spread: Record<FactionId, ModifierChain>;
  yield: Record<FactionId, ModifierChain>;
}

function buildChains(): AllChains {
  const kinds = ['attack', 'defense', 'spread', 'yield'] as const;
  const out = {} as AllChains;
  for (const kind of kinds) {
    const row = {} as Record<FactionId, ModifierChain>;
    for (const f of FACTION_IDS) {
      row[f] = createModifierChain(`creep-warfare/${f}/${kind}`);
    }
    out[kind] = row;
  }
  return out;
}

function wipeAllNonPlayer(grid: CreepGrid['grid']): void {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell = grid.at(x, y);
      if (cell.owner !== null && cell.owner !== PLAYER_FACTION) {
        grid.set(x, y, { ...cell, owner: null, hp: 0 });
      }
    }
  }
}

function paintPlayer(grid: CreepGrid['grid'], cells: number): void {
  // Row-major walk, skipping impassable (rock) cells so we only colour real
  // terrain. Anything pre-owned by the player counts toward the quota.
  let painted = 0;
  for (let y = 0; y < MAP_HEIGHT && painted < cells; y++) {
    for (let x = 0; x < MAP_WIDTH && painted < cells; x++) {
      const cell = grid.at(x, y);
      if (cell.terrain === 'rock') continue;
      if (cell.owner === PLAYER_FACTION) {
        painted++;
        continue;
      }
      grid.set(x, y, { ...cell, owner: PLAYER_FACTION, hp: BASE_HP });
      painted++;
    }
  }
}

describe('creep-warfare achievements', () => {
  let grid: CreepGrid;
  let round: RoundSystem;
  let upgrades: UpgradeSystem;
  let sys: AchievementSystem;

  beforeAll(() => {
    grid = createCreepGrid(vars);
    const chains = buildChains();

    const essence = withPersistentContext('creep-warfare-essence', () => {
      const out = {} as Record<FactionId, Resource<DecimalSource>>;
      for (const f of FACTION_IDS) {
        out[f] = createResource<DecimalSource>(0, { displayName: FACTION_ESSENCE_NAMES[f] });
      }
      return out;
    });

    const pes = createPersistentEffectSystem({ id: 'achievements-test-effects' });
    createGoalSystem({
      pes,
      chains,
      hotspots: grid.blueprint.hotspots,
      grid: grid.grid,
      startingGoalSlots: vars.archetype.startingGoalSlots,
      goalMultiplier: vars.balance.goalMultiplier,
    });
    upgrades = createUpgradeSystem({
      essence,
      chains,
      maxLevel: vars.balance.essenceUpgradeMaxLevel,
    });
    const upgradeAmounts = FACTION_IDS.flatMap((f) => {
      const cat = upgrades.categoriesByFaction[f];
      return UPGRADE_DEFS.map((def) => cat.getPurchasable(def.id)!.amount);
    });
    round = createRoundSystem({
      grid: grid.grid,
      creepGrid: grid,
      hotspots: grid.blueprint.hotspots,
      extraResettables: upgradeAmounts,
      roundLengthSec: vars.archetype.roundLengthSec,
      endOfRoundCountdownSec: vars.archetype.endOfRoundCountdownSec,
      metaCurrencyPerCell: vars.balance.metaCurrencyPerCell,
      metaCurrencyPerHotspot: vars.balance.metaCurrencyPerHotspot,
      metaCurrencyName: vars.theme.metaCurrencyName,
      playerFaction: vars.archetype.playerFaction,
    });
    sys = createAchievementSystem({
      grid: grid.grid,
      hotspots: grid.blueprint.hotspots,
      round,
      playerFaction: vars.archetype.playerFaction,
    });
  });

  it('starts with zero achievements earned', () => {
    expect(sys.achievements.earnedCount.value).toBe(0);
  });

  it('earns first-quarter once the player holds ≥25% of the map', async () => {
    const firstQuarter = sys.achievements.getAchievement('first-quarter')!;
    expect(firstQuarter.earned.value).toBe(false);

    // 25% of 3600 cells = 900. Paint 910 for headroom over rock exclusions.
    paintPlayer(grid.grid, 910);
    sys.onEngineTick(1);
    await nextTick();
    expect(firstQuarter.earned.value).toBe(true);
  });

  it('advances the total-dominance hold timer only while all hotspots are player-owned', async () => {
    const totalDominance = sys.achievements.getAchievement('total-dominance')!;
    expect(totalDominance.earned.value).toBe(false);

    // Paint every hotspot player.
    for (const h of grid.blueprint.hotspots) {
      const cell = grid.grid.at(h.x, h.y);
      grid.grid.set(h.x, h.y, { ...cell, owner: PLAYER_FACTION, hp: BASE_HP });
    }

    // 20 seconds of hold — below the 30s threshold.
    for (let i = 0; i < 20; i++) sys.onEngineTick(1);
    await nextTick();
    expect(totalDominance.earned.value).toBe(false);

    // Lose one hotspot — timer resets.
    const first = grid.blueprint.hotspots[0];
    const firstCell = grid.grid.at(first.x, first.y);
    grid.grid.set(first.x, first.y, { ...firstCell, owner: 'blue' });
    sys.onEngineTick(1);
    await nextTick();
    expect(totalDominance.earned.value).toBe(false);

    // Retake and hold for 30s — earns.
    grid.grid.set(first.x, first.y, { ...firstCell, owner: PLAYER_FACTION, hp: BASE_HP });
    for (let i = 0; i < 30; i++) sys.onEngineTick(1);
    await nextTick();
    expect(totalDominance.earned.value).toBe(true);
  });

  it('earns landslide, sole-survivor, and blitzkrieg on a fast wipe-out round end', async () => {
    const landslide = sys.achievements.getAchievement('landslide')!;
    const soleSurvivor = sys.achievements.getAchievement('sole-survivor')!;
    const blitzkrieg = sys.achievements.getAchievement('blitzkrieg')!;
    expect(landslide.earned.value).toBe(false);
    expect(soleSurvivor.earned.value).toBe(false);
    expect(blitzkrieg.earned.value).toBe(false);

    // Sweep the map: remove every non-player owner and paint ≥75% for the
    // player. Round termination conditions check surviving factions from
    // live grid state.
    wipeAllNonPlayer(grid.grid);
    paintPlayer(grid.grid, Math.ceil(MAP_WIDTH * MAP_HEIGHT * 0.8));

    // Short elapsed — under the 60s blitzkrieg cap. Tick a few seconds in.
    sys.onEngineTick(1);
    round.onEngineTick(5);
    expect(round.elapsed.value).toBeGreaterThan(0);

    round.endRound();
    await nextTick();

    expect(round.phase.value).toBe('ended');
    expect(round.stats.value.survivingFactions).toBe(1);
    expect(round.stats.value.elapsed).toBeLessThan(60);
    expect(round.stats.value.territory / (MAP_WIDTH * MAP_HEIGHT)).toBeGreaterThanOrEqual(0.75);

    expect(landslide.earned.value).toBe(true);
    expect(soleSurvivor.earned.value).toBe(true);
    expect(blitzkrieg.earned.value).toBe(true);
  });
});

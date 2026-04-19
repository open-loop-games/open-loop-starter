/**
 * Round lifecycle + reset composition tests (OL-511).
 *
 * Validates the two OL-504 "validates" bullets that land in this ticket:
 *   - `createReset` + `createRetentionPolicy` composition (round-scoped state
 *     wiped; meta-currency / meta-upgrade levels / goal capacity retained).
 *   - Bitmap-blob persistence cleanly wipes between rounds without leaking
 *     stale cell state (owner / HP / reservoir).
 *
 * We build the grid + essence + goal + upgrade + round + meta systems directly,
 * using the same persistent-context ids as the production module. Persistent
 * registry collisions with other test files are side-stepped by building
 * everything once in `beforeAll` and reusing it — identical pattern to
 * upgrades/goals/ai/hotspots tests.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  Decimal,
  addResource,
  createModifierChain,
  createPersistentEffectSystem,
  createResource,
  withPersistentContext,
  type DecimalSource,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import { createCreepGrid, type CreepGrid } from '../grid';
import { createGoalSystem, type GoalSystem } from '../goals';
import { createUpgradeSystem, type UpgradeSystem } from '../upgrades';
import { createRoundSystem, type RoundSystem } from '../round';
import { createMetaSystem, type MetaSystem } from '../meta';
import {
  FACTION_IDS,
  UPGRADE_DEFS,
  metaUpgradeDefs,
  type FactionId,
} from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();
const BASE_HP = vars.balance.baseHp;
const PLAYER_FACTION = vars.archetype.playerFaction;
const STARTING_GOAL_SLOTS = vars.archetype.startingGoalSlots;
const META_UPGRADE_DEFS = metaUpgradeDefs(vars.archetype.maxGoalSlots, vars.archetype.startingGoalSlots);
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

describe('round lifecycle + reset', () => {
  let grid: CreepGrid;
  let chains: AllChains;
  let essence: Record<FactionId, Resource<DecimalSource>>;
  let goals: GoalSystem;
  let upgrades: UpgradeSystem;
  let round: RoundSystem;
  let meta: MetaSystem;

  beforeAll(() => {
    grid = createCreepGrid(vars);
    chains = buildChains();

    essence = withPersistentContext('creep-warfare-essence', () => {
      const out = {} as Record<FactionId, Resource<DecimalSource>>;
      for (const f of FACTION_IDS) {
        out[f] = createResource<DecimalSource>(0, { displayName: FACTION_ESSENCE_NAMES[f] });
      }
      return out;
    });

    const pes = createPersistentEffectSystem({ id: 'round-test-effects' });
    goals = createGoalSystem({
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
    meta = createMetaSystem({
      metaCurrency: round.metaCurrency,
      chains,
      slotCapacity: goals.capacity,
      playerFaction: vars.archetype.playerFaction,
      maxGoalSlots: vars.archetype.maxGoalSlots,
      metaUpgradeDefs: META_UPGRADE_DEFS,
    });
  });

  it('starts in active phase with zero elapsed and default capacity', () => {
    expect(round.phase.value).toBe('active');
    expect(round.elapsed.value).toBe(0);
    expect(goals.capacity.value).toBe(STARTING_GOAL_SLOTS);
  });

  it('awards meta-currency linearly in player territory + hotspots and wipes round-scoped state on startNextRound', () => {
    // Seed round state: player owns extra cells and the centre hotspot;
    // goal selected; essence accumulated; per-faction upgrade purchased.
    grid.grid.set(10, 10, { terrain: 'open', owner: PLAYER_FACTION, hp: BASE_HP, reservoir: 0 });
    grid.grid.set(10, 11, { terrain: 'open', owner: PLAYER_FACTION, hp: BASE_HP, reservoir: 0 });
    const midHotspot = grid.blueprint.hotspots.find((h) => h.id === 'hs-center')!;
    grid.grid.set(midHotspot.x, midHotspot.y, {
      terrain: 'hotspot',
      owner: PLAYER_FACTION,
      hp: 0,
      hotspotId: 'hs-center',
      reservoir: 100,
    });

    goals.slots[PLAYER_FACTION].select(`claim:hotspot-${midHotspot.id}`);
    addResource(essence[PLAYER_FACTION], 50);

    const yieldUp = upgrades.get(PLAYER_FACTION, 'yield')!;
    expect(yieldUp.canPurchase.value).toBe(true);
    yieldUp.purchase();
    expect(Decimal.gt(yieldUp.amount.value, 0)).toBe(true);

    // Freeze the round, capture stats + reward.
    expect(round.phase.value).toBe('active');
    round.endRound();
    expect(round.phase.value).toBe('ended');

    const stats = round.stats.value;
    // spawn + 2 extra + hotspot cell = 4 territory; 1 hotspot
    // (hotspot cells count toward territory as well as the hotspot tally —
    // they're still owned ground.)
    expect(stats.territory).toBe(4);
    expect(stats.hotspotsHeld).toBe(1);

    // Linear: 4 * 0.05 + 1 * 5 = 5.2 → floor = 5
    expect(Number(round.awardedReward.value)).toBe(5);
    expect(Number(round.metaCurrency.value)).toBe(5);

    // Purchase one meta-upgrade to verify retention.
    const metaYield = meta.get('yield')!;
    expect(metaYield.canPurchase.value).toBe(true);
    metaYield.purchase();
    expect(Number(metaYield.amount.value)).toBe(1);

    // Meta-currency left after spend.
    const metaAfterBuy = new Decimal(round.metaCurrency.value);

    // Advance to next round.
    round.startNextRound();
    expect(round.phase.value).toBe('active');

    // Round-scoped state wiped:
    expect(Number(essence[PLAYER_FACTION].value)).toBe(0);
    const freshYieldUp = upgrades.get(PLAYER_FACTION, 'yield')!;
    expect(Number(freshYieldUp.amount.value)).toBe(0);
    expect(goals.slots[PLAYER_FACTION].selected.value).toEqual([]);

    // Grid wiped — the cells we mutated are back to their blueprint baseline.
    expect(grid.grid.at(10, 10).owner).toBeNull();
    expect(grid.grid.at(10, 11).owner).toBeNull();
    expect(Number(grid.grid.at(10, 10).hp)).toBe(0);
    // Post-shuffle, some faction owns the centre-hotspot corner, but the
    // hotspot itself is neutral on a fresh map and its reservoir is full.
    const mid = grid.grid.at(midHotspot.x, midHotspot.y);
    expect(mid.owner).toBeNull();
    expect(Number(mid.reservoir)).toBe(midHotspot.capacity);

    // Retained across reset:
    expect(Decimal.eq(round.metaCurrency.value, metaAfterBuy)).toBe(true);
    expect(Number(metaYield.amount.value)).toBe(1);
    expect(goals.capacity.value).toBe(STARTING_GOAL_SLOTS);

    // Seed advanced.
    expect(round.seed.value).toBeGreaterThan(1);
  });

  it('slot-capacity meta-upgrade ratchets goals.capacity', () => {
    // Buy-up to enough meta-currency.
    addResource(round.metaCurrency, 1000);

    const cap = meta.get('slot-capacity')!;
    const before = goals.capacity.value;
    expect(cap.canPurchase.value).toBe(true);
    cap.purchase();
    expect(goals.capacity.value).toBe(before + 1);

    // Capacity survives a round reset.
    round.endRound();
    round.startNextRound();
    expect(goals.capacity.value).toBe(before + 1);
  });

  it('isTerminated flips true when only one faction survives', () => {
    // Wipe all non-player spawns to make player the sole surviving faction.
    for (const spawn of grid.blueprint.spawns) {
      if (spawn.faction === PLAYER_FACTION) continue;
      grid.grid.set(spawn.x, spawn.y, {
        terrain: spawn.faction ? 'open' : 'open',
        owner: null,
        hp: 0,
        reservoir: 0,
      });
    }
    // Also clear any stray ownership from prior test iterations.
    const w = grid.grid.width;
    const h = grid.grid.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = grid.grid.at(x, y);
        if (c.owner != null && c.owner !== PLAYER_FACTION) {
          grid.grid.set(x, y, { ...c, owner: null, hp: 0 });
        }
      }
    }
    expect(round.isTerminated()).toBe(true);
  });

  it('has a registered meta-upgrade for every MetaUpgradeDef', () => {
    for (const def of META_UPGRADE_DEFS) {
      expect(meta.get(def.id)).toBeDefined();
    }
    // And per-faction essence upgrades exist for every UpgradeDef
    for (const def of UPGRADE_DEFS) {
      expect(upgrades.get(PLAYER_FACTION, def.id)).toBeDefined();
    }
  });
});

import type { BuildingDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-instance cost scaling default. Cycler follows the Kingdom / Thronefall
// convention of fixed per-instance price + per-cycle escalation (see
// `CyclerBalance.perCycleIncomeGrowth` for the cross-cycle layer).

export const BUILDING_COST_SCALING_DEFAULT = 1.0;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 6 building archetypes covering all four roles. Day/Night Kingdom theme
// baked inline (cycler.md § 11 Theme A). Six is slightly richer than
// Defender's 4 because Cycler needs both build-phase-active and
// defend-phase-active kinds. Forks override names in place and add types
// by appending.

export const BUILDINGS: BuildingDef[] = [
  // Farm — income during build phase (daylight harvest).
  {
    id: 'farm',
    name: 'Farm',
    role: 'income',
    phaseContribution: {
      build: { goldPerTick: 3 },
    },
    purchase: { baseCost: 50, costScaling: BUILDING_COST_SCALING_DEFAULT },
  },

  // Archer tower — defense during defend phase (nightfall bow volleys).
  {
    id: 'archer-tower',
    name: 'Archer Tower',
    role: 'defense',
    phaseContribution: {
      defend: { damagePerSec: 10, range: 3 },
    },
    purchase: { baseCost: 80, costScaling: BUILDING_COST_SCALING_DEFAULT },
  },

  // Barracks — support; adjacency-aura boosts neighbouring defenders.
  {
    id: 'barracks',
    name: 'Barracks',
    role: 'support',
    phaseContribution: {
      build: { populationBonus: 2 },
    },
    purchase: { baseCost: 120, costScaling: BUILDING_COST_SCALING_DEFAULT },
    adjacencyAura: {
      radius: 2,
      buff: { damageMul: 1.2 },
    },
  },

  // Wall segment — infrastructure; absorbs enemy damage, no direct output.
  {
    id: 'wall-segment',
    name: 'Wall Segment',
    role: 'infrastructure',
    phaseContribution: {
      defend: { damagePerSec: 0, range: 0 },
    },
    purchase: { baseCost: 30, costScaling: BUILDING_COST_SCALING_DEFAULT },
  },

  // Watchtower — support; extends adjacency range of nearby defenders.
  {
    id: 'watchtower',
    name: 'Watchtower',
    role: 'support',
    phaseContribution: {
      defend: { damagePerSec: 4, range: 4 },
    },
    purchase: { baseCost: 100, costScaling: BUILDING_COST_SCALING_DEFAULT },
    adjacencyAura: {
      radius: 2,
      buff: { rangeMul: 1.3 },
    },
  },

  // Workshop — income compound; multiplies adjacent farm output.
  {
    id: 'workshop',
    name: 'Workshop',
    role: 'income',
    phaseContribution: {
      build: { goldPerTick: 1 },
    },
    purchase: { baseCost: 150, costScaling: BUILDING_COST_SCALING_DEFAULT },
    adjacencyAura: {
      radius: 1,
      buff: { incomeMul: 1.5 },
    },
  },
];

export const BUILDING_IDS = BUILDINGS.map((b) => b.id) as readonly string[];

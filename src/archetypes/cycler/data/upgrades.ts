import type { UpgradeDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Upgrade effects stack multiplicatively into each building's phase-scoped
// modifier chain (see cycler.md § 3 stress axis 1). Tier-N cost scales
// from tier-1 cost via `CyclerBalance.upgradeCostScaling` (default 2.5).

export const UPGRADE_DAMAGE_MUL_DEFAULT = 1.4;
export const UPGRADE_INCOME_MUL_DEFAULT = 1.5;
export const UPGRADE_RANGE_MUL_DEFAULT = 1.2;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 3 tiers × 6 buildings = 18 upgrades. Each binds to one building and
// stacks into its phase-scoped chain. Tier-2 unlocks at cycle 3 (content-
// registry gate, consumer-side); tier-3 at cycle 10.

export const UPGRADES: UpgradeDef[] = [
  // Farm — income ladder.
  {
    id: 'farm-t1',
    name: 'Tilled Fields',
    description: '+50% gold per tick on farms.',
    targetBuildingId: 'farm',
    tier: 1,
    cost: 80,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },
  {
    id: 'farm-t2',
    name: 'Windmills',
    description: '+50% gold per tick on farms.',
    targetBuildingId: 'farm',
    tier: 2,
    cost: 200,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },
  {
    id: 'farm-t3',
    name: 'Crop Rotation',
    description: '+50% gold per tick on farms.',
    targetBuildingId: 'farm',
    tier: 3,
    cost: 500,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },

  // Archer tower — damage ladder.
  {
    id: 'archer-tower-t1',
    name: 'Sharpened Arrows',
    description: '+40% damage on archer towers.',
    targetBuildingId: 'archer-tower',
    tier: 1,
    cost: 100,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT },
  },
  {
    id: 'archer-tower-t2',
    name: 'Longbow',
    description: '+40% damage, +20% range.',
    targetBuildingId: 'archer-tower',
    tier: 2,
    cost: 250,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, rangeMul: UPGRADE_RANGE_MUL_DEFAULT },
  },
  {
    id: 'archer-tower-t3',
    name: 'Crossbow Lines',
    description: '+40% damage, +20% range.',
    targetBuildingId: 'archer-tower',
    tier: 3,
    cost: 625,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, rangeMul: UPGRADE_RANGE_MUL_DEFAULT },
  },

  // Barracks — aura ladder.
  {
    id: 'barracks-t1',
    name: 'Drill Sergeant',
    description: '+20% aura damage buff.',
    targetBuildingId: 'barracks',
    tier: 1,
    cost: 140,
    effect: { damageMul: 1.2 },
  },
  {
    id: 'barracks-t2',
    name: 'Banner of War',
    description: '+20% aura damage, +25% aura range.',
    targetBuildingId: 'barracks',
    tier: 2,
    cost: 350,
    effect: { damageMul: 1.2, rangeMul: 1.25 },
  },
  {
    id: 'barracks-t3',
    name: 'Captain Present',
    description: '+20% aura damage, wider muster.',
    targetBuildingId: 'barracks',
    tier: 3,
    cost: 875,
    effect: { damageMul: 1.2, rangeMul: 1.25 },
  },

  // Wall segment — durability (modelled as incomeMul placeholder; walls
  // don't output but the upgrade slot fills the 3×6=18 enumeration. Forks
  // swap for an `hpMul` field once walls acquire HP in the extended data
  // shape).
  {
    id: 'wall-segment-t1',
    name: 'Stone Reinforcement',
    description: 'Placeholder: wall durability tier.',
    targetBuildingId: 'wall-segment',
    tier: 1,
    cost: 60,
    effect: {},
  },
  {
    id: 'wall-segment-t2',
    name: 'Mortared Joints',
    description: 'Placeholder: wall durability tier.',
    targetBuildingId: 'wall-segment',
    tier: 2,
    cost: 150,
    effect: {},
  },
  {
    id: 'wall-segment-t3',
    name: 'Gatehouse',
    description: 'Placeholder: wall durability tier.',
    targetBuildingId: 'wall-segment',
    tier: 3,
    cost: 375,
    effect: {},
  },

  // Watchtower — range ladder.
  {
    id: 'watchtower-t1',
    name: 'Signal Beacons',
    description: '+30% aura range on adjacent defenders.',
    targetBuildingId: 'watchtower',
    tier: 1,
    cost: 120,
    effect: { rangeMul: 1.3 },
  },
  {
    id: 'watchtower-t2',
    name: 'Telescopic Sights',
    description: '+30% aura range, +20% direct damage.',
    targetBuildingId: 'watchtower',
    tier: 2,
    cost: 300,
    effect: { rangeMul: 1.3, damageMul: 1.2 },
  },
  {
    id: 'watchtower-t3',
    name: 'Eagle Scouts',
    description: '+30% aura range, +20% direct damage.',
    targetBuildingId: 'watchtower',
    tier: 3,
    cost: 750,
    effect: { rangeMul: 1.3, damageMul: 1.2 },
  },

  // Workshop — income compound.
  {
    id: 'workshop-t1',
    name: 'Journeyman Tools',
    description: '+50% adjacency income buff.',
    targetBuildingId: 'workshop',
    tier: 1,
    cost: 180,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },
  {
    id: 'workshop-t2',
    name: 'Master Artisans',
    description: '+50% adjacency income buff.',
    targetBuildingId: 'workshop',
    tier: 2,
    cost: 450,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },
  {
    id: 'workshop-t3',
    name: 'Guild Charter',
    description: '+50% adjacency income buff.',
    targetBuildingId: 'workshop',
    tier: 3,
    cost: 1125,
    effect: { incomeMul: UPGRADE_INCOME_MUL_DEFAULT },
  },
];

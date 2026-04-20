import type { UpgradeDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Upgrade effects stack multiplicatively into the per-tower modifier chain
// (see defender.md § 3 stress axis 2). Tier-N cost is tier-1 cost × (2.5 ^ (N-1))
// at `DefenderBalance.upgradeCostScaling` = 2.5.

export const UPGRADE_DAMAGE_MUL_DEFAULT = 1.5;
export const UPGRADE_SPEED_MUL_DEFAULT = 1.25;
export const UPGRADE_RANGE_MUL_DEFAULT = 1.2;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 3 tiers × 4 defenders = 12 upgrades. Each binds to one defender
// archetype. Skeleton-level choice — fork expansions live in Tier 4+ or
// extra branches per tower.

export const UPGRADES: UpgradeDef[] = [
  // Archer — pierce ladder.
  {
    id: 'archer-t1',
    name: 'Sharpened Arrows',
    description: '+50% damage to archer towers.',
    targetDefenderId: 'archer',
    tier: 1,
    cost: 60,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT },
  },
  {
    id: 'archer-t2',
    name: 'Longbow',
    description: '+50% damage, +20% range.',
    targetDefenderId: 'archer',
    tier: 2,
    cost: 150,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, rangeMul: UPGRADE_RANGE_MUL_DEFAULT },
  },
  {
    id: 'archer-t3',
    name: 'Rapid Fire',
    description: '+50% damage, +25% attack speed.',
    targetDefenderId: 'archer',
    tier: 3,
    cost: 375,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, speedMul: UPGRADE_SPEED_MUL_DEFAULT },
  },

  // Mage — magic ladder.
  {
    id: 'mage-t1',
    name: 'Arcane Focus',
    description: '+50% damage to mage towers.',
    targetDefenderId: 'mage',
    tier: 1,
    cost: 90,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT },
  },
  {
    id: 'mage-t2',
    name: 'Piercing Spell',
    description: '+50% damage, +20% range.',
    targetDefenderId: 'mage',
    tier: 2,
    cost: 225,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, rangeMul: UPGRADE_RANGE_MUL_DEFAULT },
  },
  {
    id: 'mage-t3',
    name: 'Chain Lightning',
    description: '+50% damage, +25% attack speed.',
    targetDefenderId: 'mage',
    tier: 3,
    cost: 560,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, speedMul: UPGRADE_SPEED_MUL_DEFAULT },
  },

  // Splash — AoE ladder.
  {
    id: 'splash-t1',
    name: 'Heavier Shells',
    description: '+50% splash damage.',
    targetDefenderId: 'splash',
    tier: 1,
    cost: 140,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT },
  },
  {
    id: 'splash-t2',
    name: 'Wider Burst',
    description: '+50% damage, +20% range.',
    targetDefenderId: 'splash',
    tier: 2,
    cost: 350,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, rangeMul: UPGRADE_RANGE_MUL_DEFAULT },
  },
  {
    id: 'splash-t3',
    name: 'Rapid Reload',
    description: '+50% damage, +25% attack speed.',
    targetDefenderId: 'splash',
    tier: 3,
    cost: 875,
    effect: { damageMul: UPGRADE_DAMAGE_MUL_DEFAULT, speedMul: UPGRADE_SPEED_MUL_DEFAULT },
  },

  // Barracks — aura ladder.
  {
    id: 'barracks-t1',
    name: 'Drill Sergeant',
    description: '+20% aura damage buff.',
    targetDefenderId: 'barracks',
    tier: 1,
    cost: 80,
    effect: { damageMul: 1.2 },
  },
  {
    id: 'barracks-t2',
    name: 'Banner of War',
    description: '+20% aura damage, +25% aura range.',
    targetDefenderId: 'barracks',
    tier: 2,
    cost: 200,
    effect: { damageMul: 1.2, rangeMul: 1.25 },
  },
  {
    id: 'barracks-t3',
    name: 'Captain Present',
    description: '+20% aura damage, +25% aura speed.',
    targetDefenderId: 'barracks',
    tier: 3,
    cost: 500,
    effect: { damageMul: 1.2, speedMul: 1.25 },
  },
];

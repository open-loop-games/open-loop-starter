import type { UpgradeDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Upgrade effects stack multiplicatively into each item's modifier chain
// (see packer.md § 3 stress axis 3). Tier-N cost scales from tier-1 cost
// via `PackerBalance.upgradeCostScaling`-style escalation (a polynomial
// factor documented against probes in § 6).

export const UPGRADE_OUTPUT_MUL_DEFAULT = 1.3;
export const UPGRADE_BONUS_MUL_DEFAULT = 1.25;
export const UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT = 1.5;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 3 tiers × 6 categories = 18 category-scoped upgrades. Each upgrade binds
// to an item category and stacks multiplicatively into matching items'
// modifier chains. Tier-2 unlocks at round 4; tier-3 at round 8. Fantasy
// Adventurer (§ 11 Theme A) costume baked inline.

export const UPGRADES: UpgradeDef[] = [
  // Weapons — damage ladder.
  {
    id: 'weapons-t1',
    name: 'Sharpened Edges',
    description: '+30% damage on all weapons.',
    scope: { kind: 'category', category: 'weapon' },
    tier: 1,
    cost: 60,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'weapons-t2',
    name: 'Rune Etching',
    description: '+30% damage, +25% neighbour bonus on all weapons.',
    scope: { kind: 'category', category: 'weapon' },
    tier: 2,
    cost: 150,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'weapons-t3',
    name: 'Mithril Forging',
    description: '+30% damage, +25% neighbour bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'weapon' },
    tier: 3,
    cost: 375,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },

  // Armor — durability / healing ladder.
  {
    id: 'armor-t1',
    name: 'Reinforced Plating',
    description: '+30% effectiveness on all armor.',
    scope: { kind: 'category', category: 'armor' },
    tier: 1,
    cost: 60,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'armor-t2',
    name: 'Enchanted Layers',
    description: '+30% effectiveness, +25% neighbour bonus on armor.',
    scope: { kind: 'category', category: 'armor' },
    tier: 2,
    cost: 150,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'armor-t3',
    name: 'Dragon-Scale Weave',
    description: '+30% effectiveness, +25% neighbour bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'armor' },
    tier: 3,
    cost: 375,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },

  // Trinkets — neighbour-bonus ladder.
  {
    id: 'trinket-t1',
    name: 'Minor Enchantment',
    description: '+30% output on all trinkets.',
    scope: { kind: 'category', category: 'trinket' },
    tier: 1,
    cost: 80,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'trinket-t2',
    name: 'Greater Enchantment',
    description: '+30% output, +25% neighbour bonus on trinkets.',
    scope: { kind: 'category', category: 'trinket' },
    tier: 2,
    cost: 200,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'trinket-t3',
    name: 'Master Enchantment',
    description: '+30% output, +25% neighbour bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'trinket' },
    tier: 3,
    cost: 500,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },

  // Consumables — heal / regen ladder.
  {
    id: 'consumable-t1',
    name: 'Concentrated Brew',
    description: '+30% heal / regen on consumables.',
    scope: { kind: 'category', category: 'consumable' },
    tier: 1,
    cost: 40,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'consumable-t2',
    name: 'Alchemist Tinctures',
    description: '+30% heal / regen, +25% neighbour bonus.',
    scope: { kind: 'category', category: 'consumable' },
    tier: 2,
    cost: 100,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'consumable-t3',
    name: 'Elixir Mastery',
    description: '+30% heal / regen, +25% neighbour bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'consumable' },
    tier: 3,
    cost: 250,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },

  // Gems — colour-chain ladder.
  {
    id: 'gem-t1',
    name: 'Polished Facets',
    description: '+30% gem output.',
    scope: { kind: 'category', category: 'gem' },
    tier: 1,
    cost: 70,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'gem-t2',
    name: 'Resonant Cuts',
    description: '+30% gem output, +25% colour-chain bonus.',
    scope: { kind: 'category', category: 'gem' },
    tier: 2,
    cost: 180,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'gem-t3',
    name: 'Perfect Alignment',
    description: '+30% gem output, +25% colour-chain bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'gem' },
    tier: 3,
    cost: 450,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },

  // Utility — aura / support ladder.
  {
    id: 'utility-t1',
    name: 'Arcane Inscription',
    description: '+30% utility effectiveness.',
    scope: { kind: 'category', category: 'utility' },
    tier: 1,
    cost: 90,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT },
  },
  {
    id: 'utility-t2',
    name: 'Bound Spellwork',
    description: '+30% utility effectiveness, +25% aura bonus.',
    scope: { kind: 'category', category: 'utility' },
    tier: 2,
    cost: 220,
    effect: { outputMul: UPGRADE_OUTPUT_MUL_DEFAULT, bonusMul: UPGRADE_BONUS_MUL_DEFAULT },
  },
  {
    id: 'utility-t3',
    name: 'Master Scrivener',
    description: '+30% utility effectiveness, +25% aura bonus, +50% aura radius.',
    scope: { kind: 'category', category: 'utility' },
    tier: 3,
    cost: 550,
    effect: {
      outputMul: UPGRADE_OUTPUT_MUL_DEFAULT,
      bonusMul: UPGRADE_BONUS_MUL_DEFAULT,
      adjacencyRadiusMul: UPGRADE_ADJACENCY_RADIUS_MUL_DEFAULT,
    },
  },
];

import type { ItemDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-neighbour bonus defaults. The packer.md § 6 `per-neighbour-bonus` probe
// perturbs these constants ×[0.80, 1.20] to validate that the bonus
// magnitude keeps the first-synergy-trigger beat within ±20% window and that
// clustering stays visibly worth doing (Placement-Adjacency Failure Mode #1:
// "Grid becomes a bin").

export const NEIGHBOUR_BONUS_DAMAGE_MUL_DEFAULT = 1.15;
export const NEIGHBOUR_BONUS_DAMAGE_FLAT_DEFAULT = 2;
export const NAMED_PAIR_DAMAGE_MUL_DEFAULT = 1.4;
export const GRADE_MULTIPLIER_DEFAULT = [1.0, 2.0, 3.5];

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 12 item archetypes at skeleton density — Fantasy Adventurer theme (§ 11
// Theme A). Enough to support 5+ named-adjacency combinations and one
// combine-up chain per category; small enough to fit a first session's
// exposure. Forks override names in place and add items by appending.

export const ITEMS: ItemDef[] = [
  // Iron sword — 1×3 weapon; +damage per adjacent weapon.
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    category: 'weapon',
    footprint: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    baseOutput: { damagePerTick: 6 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'weapon' },
        bonus: { damageMul: NEIGHBOUR_BONUS_DAMAGE_MUL_DEFAULT },
        maxStack: 3,
      },
    ],
    combineRule: {
      copiesRequired: 3,
      maxGrade: 3,
      gradeMultiplier: GRADE_MULTIPLIER_DEFAULT,
    },
    baseCost: 3,
  },

  // Round shield — 2×2 armor; +HP per adjacent armor.
  {
    id: 'round-shield',
    name: 'Round Shield',
    category: 'armor',
    footprint: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    baseOutput: { healPerTick: 1 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'armor' },
        bonus: { outputMul: 1.2 },
        maxStack: 3,
      },
    ],
    baseCost: 3,
  },

  // Crystal gem — 1×1 utility; named-pair chain with amulet-of-might.
  {
    id: 'crystal-gem',
    name: 'Crystal Gem',
    category: 'gem',
    footprint: [[0, 0]],
    baseOutput: { scoreContribution: 4 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-colour', colour: 'blue' },
        bonus: { outputMul: 1.25 },
        maxStack: 4,
      },
      {
        predicate: { kind: 'named-pair', neighbourItemId: 'amulet-of-might' },
        bonus: { damageMul: NAMED_PAIR_DAMAGE_MUL_DEFAULT },
      },
    ],
    combineRule: {
      copiesRequired: 3,
      maxGrade: 3,
      gradeMultiplier: GRADE_MULTIPLIER_DEFAULT,
    },
    baseCost: 2,
  },

  // Healing potion — 1×2 consumable; heals on-kill (combat-phase trigger).
  {
    id: 'healing-potion',
    name: 'Healing Potion',
    category: 'consumable',
    footprint: [
      [0, 0],
      [0, 1],
    ],
    baseOutput: { healPerTick: 2 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'consumable' },
        bonus: { outputMul: 1.15 },
      },
    ],
    baseCost: 2,
  },

  // Ruby ring — 1×1 trinket; multiplicative damage aura radius 1.
  {
    id: 'ruby-ring',
    name: 'Ruby Ring',
    category: 'trinket',
    footprint: [[0, 0]],
    baseOutput: { damagePerTick: 2 },
    adjacencyRules: [
      {
        predicate: { kind: 'any-occupied' },
        bonus: { damageMul: 1.1 },
        maxStack: 4,
      },
    ],
    baseCost: 3,
  },

  // Leather armor — 2×3 armor; flat HP contribution.
  {
    id: 'leather-armor',
    name: 'Leather Armor',
    category: 'armor',
    footprint: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    baseOutput: { healPerTick: 3 },
    adjacencyRules: [],
    baseCost: 4,
  },

  // Composite bow — 1×3 weapon; bonus per adjacent trinket.
  {
    id: 'composite-bow',
    name: 'Composite Bow',
    category: 'weapon',
    footprint: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    baseOutput: { damagePerTick: 5 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'trinket' },
        bonus: { damageMul: 1.25 },
        maxStack: 3,
      },
    ],
    combineRule: {
      copiesRequired: 3,
      maxGrade: 3,
      gradeMultiplier: GRADE_MULTIPLIER_DEFAULT,
    },
    baseCost: 3,
  },

  // Enchantment tome — 2×2 utility; buffs adjacent weapons.
  {
    id: 'enchantment-tome',
    name: 'Enchantment Tome',
    category: 'utility',
    footprint: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    baseOutput: {},
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'weapon' },
        bonus: { damageMul: 1.3 },
        maxStack: 4,
      },
    ],
    baseCost: 4,
  },

  // Stamina flask — 1×1 consumable; regens on-hurt.
  {
    id: 'stamina-flask',
    name: 'Stamina Flask',
    category: 'consumable',
    footprint: [[0, 0]],
    baseOutput: { healPerTick: 1 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'consumable' },
        bonus: { outputMul: 1.1 },
      },
    ],
    baseCost: 1,
  },

  // Kite shield — 2×2 armor; first-hit block flavour (modelled as flat HP).
  {
    id: 'kite-shield',
    name: 'Kite Shield',
    category: 'armor',
    footprint: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    baseOutput: { healPerTick: 2 },
    adjacencyRules: [
      {
        predicate: { kind: 'named-pair', neighbourItemId: 'iron-sword' },
        bonus: { outputMul: NAMED_PAIR_DAMAGE_MUL_DEFAULT },
      },
    ],
    baseCost: 4,
  },

  // Amulet of might — 1×1 trinket; global +all-damage.
  {
    id: 'amulet-of-might',
    name: 'Amulet of Might',
    category: 'trinket',
    footprint: [[0, 0]],
    baseOutput: { damagePerTick: 1 },
    adjacencyRules: [
      {
        predicate: { kind: 'any-occupied' },
        bonus: { flatDamage: NEIGHBOUR_BONUS_DAMAGE_FLAT_DEFAULT },
        maxStack: 8,
      },
    ],
    baseCost: 5,
  },

  // Spiked gauntlets — 1×2 weapon; counter-damage on hit.
  {
    id: 'spiked-gauntlets',
    name: 'Spiked Gauntlets',
    category: 'weapon',
    footprint: [
      [0, 0],
      [0, 1],
    ],
    baseOutput: { damagePerTick: 4 },
    adjacencyRules: [
      {
        predicate: { kind: 'same-category', category: 'armor' },
        bonus: { damageMul: 1.2 },
        maxStack: 2,
      },
    ],
    combineRule: {
      copiesRequired: 3,
      maxGrade: 3,
      gradeMultiplier: GRADE_MULTIPLIER_DEFAULT,
    },
    baseCost: 2,
  },
];

export const ITEM_IDS = ITEMS.map((i) => i.id) as readonly string[];

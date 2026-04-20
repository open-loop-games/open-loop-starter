import type { UnitDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-tier baseline stats and canonical combine-up curve. Star multipliers
// follow the Dota Auto Chess / TFT / SAP [1.0, 2.0, 3.5] convention — each
// star roughly doubles damage/HP. Tuning per auto-battler.md § 6
// `combine-up-copy-curve` probe lives in `balance.starMultiplier` +
// `combineRule.copiesToStar2`.

export const STAR_MULTIPLIER_DEFAULT = [1.0, 2.0, 3.5];
export const COPIES_TO_STAR_2_DEFAULT = 3;
export const COPIES_TO_STAR_3_DEFAULT = 3;

const combine = {
  copiesToStar2: COPIES_TO_STAR_2_DEFAULT,
  starsToStar3: COPIES_TO_STAR_3_DEFAULT,
  starMultiplier: STAR_MULTIPLIER_DEFAULT,
};

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 18 units at skeleton density — 3 per shop tier across tiers 1–6. Heroes &
// Beasts (§ 11 Theme A) costume baked inline: 6 Species (Human / Elf / Beast
// / Dragon / Demon / Undead) × 5 Classes (Warrior / Knight / Mage / Assassin
// / Druid / Hunter — 6 pick 5). Forks override names in place and extend the
// roster freely; DAC's 60-unit canonical set is the fork-expansion target.

export const UNITS: UnitDef[] = [
  // ─── Tier 1 (3 units) ──────────────────────────────────────────────────

  {
    id: 'initiate',
    name: 'Initiate',
    tier: 1,
    baseCost: 1,
    tags: ['Human', 'Warrior'],
    baseStats: { hp: 600, attackDamage: 55, attackSpeed: 0.7 },
    combineRule: combine,
  },
  {
    id: 'pup',
    name: 'Pup',
    tier: 1,
    baseCost: 1,
    tags: ['Beast', 'Assassin'],
    baseStats: { hp: 400, attackDamage: 75, attackSpeed: 1.2 },
    ability: {
      trigger: 'on-kill',
      effect: { buff: { attackDamage: 10 } },
      target: 'self',
    },
    combineRule: combine,
  },
  {
    id: 'sapling',
    name: 'Sapling',
    tier: 1,
    baseCost: 1,
    tags: ['Elf', 'Druid'],
    baseStats: { hp: 500, attackDamage: 40, attackSpeed: 0.8, range: 2 },
    combineRule: combine,
  },

  // ─── Tier 2 (3 units) ──────────────────────────────────────────────────

  {
    id: 'squire',
    name: 'Squire',
    tier: 2,
    baseCost: 2,
    tags: ['Human', 'Knight'],
    baseStats: { hp: 900, attackDamage: 70, attackSpeed: 0.6 },
    combineRule: combine,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    tier: 2,
    baseCost: 2,
    tags: ['Beast', 'Warrior'],
    baseStats: { hp: 700, attackDamage: 100, attackSpeed: 0.9 },
    combineRule: combine,
  },
  {
    id: 'cub',
    name: 'Cub',
    tier: 2,
    baseCost: 2,
    tags: ['Beast', 'Druid'],
    baseStats: { hp: 650, attackDamage: 55, attackSpeed: 0.9, range: 2 },
    ability: {
      trigger: 'at-round-start',
      effect: { heal: 60 },
      target: 'all-friends',
    },
    combineRule: combine,
  },

  // ─── Tier 3 (3 units) ──────────────────────────────────────────────────

  {
    id: 'ranger',
    name: 'Ranger',
    tier: 3,
    baseCost: 3,
    tags: ['Elf', 'Hunter'],
    baseStats: { hp: 700, attackDamage: 110, attackSpeed: 1.1, range: 4 },
    combineRule: combine,
  },
  {
    id: 'iron-soldier',
    name: 'Iron Soldier',
    tier: 3,
    baseCost: 3,
    tags: ['Human', 'Knight'],
    baseStats: { hp: 1100, attackDamage: 85, attackSpeed: 0.6 },
    combineRule: combine,
  },
  {
    id: 'firebeetle',
    name: 'Firebeetle',
    tier: 3,
    baseCost: 3,
    tags: ['Demon', 'Assassin'],
    baseStats: { hp: 800, attackDamage: 140, attackSpeed: 1.0 },
    ability: {
      trigger: 'on-attack',
      effect: { damage: 30 },
      target: 'random-enemy',
    },
    combineRule: combine,
  },

  // ─── Tier 4 (3 units) ──────────────────────────────────────────────────

  {
    id: 'archmage',
    name: 'Archmage',
    tier: 4,
    baseCost: 4,
    tags: ['Elf', 'Mage'],
    baseStats: { hp: 900, attackDamage: 90, attackSpeed: 0.8, range: 4, abilityCost: 100 },
    ability: {
      trigger: 'on-attack',
      effect: { damage: 200 },
      target: 'random-enemy',
    },
    combineRule: combine,
  },
  {
    id: 'armoured-bear',
    name: 'Armoured Bear',
    tier: 4,
    baseCost: 4,
    tags: ['Beast', 'Warrior'],
    baseStats: { hp: 1600, attackDamage: 130, attackSpeed: 0.7 },
    combineRule: combine,
  },
  {
    id: 'flame-summoner',
    name: 'Flame Summoner',
    tier: 4,
    baseCost: 4,
    tags: ['Demon', 'Mage'],
    baseStats: { hp: 850, attackDamage: 100, attackSpeed: 0.7, range: 3, abilityCost: 80 },
    ability: {
      trigger: 'on-attack',
      effect: { summon: 'firebeetle' },
      target: 'self',
    },
    combineRule: combine,
  },

  // ─── Tier 5 (3 units) ──────────────────────────────────────────────────

  {
    id: 'paladin',
    name: 'Paladin',
    tier: 5,
    baseCost: 5,
    tags: ['Human', 'Knight'],
    baseStats: { hp: 1800, attackDamage: 160, attackSpeed: 0.7 },
    ability: {
      trigger: 'on-hurt',
      effect: { heal: 80 },
      target: 'self',
    },
    combineRule: combine,
  },
  {
    id: 'wyvern',
    name: 'Wyvern',
    tier: 5,
    baseCost: 5,
    tags: ['Dragon', 'Hunter'],
    baseStats: { hp: 1400, attackDamage: 180, attackSpeed: 1.0, range: 3 },
    combineRule: combine,
  },
  {
    id: 'druid-archon',
    name: 'Druid Archon',
    tier: 5,
    baseCost: 5,
    tags: ['Elf', 'Druid'],
    baseStats: { hp: 1500, attackDamage: 140, attackSpeed: 0.9, range: 3 },
    ability: {
      trigger: 'on-kill',
      effect: { heal: 150 },
      target: 'all-friends',
    },
    combineRule: combine,
  },

  // ─── Tier 6 (3 units) — capstones ──────────────────────────────────────

  {
    id: 'ancient-dragon',
    name: 'Ancient Dragon',
    tier: 6,
    baseCost: 6,
    tags: ['Dragon', 'Mage'],
    baseStats: { hp: 2400, attackDamage: 210, attackSpeed: 0.8, range: 4, abilityCost: 120 },
    ability: {
      trigger: 'on-attack',
      effect: { damage: 400 },
      target: 'all-enemies',
    },
  },
  {
    id: 'demon-lord',
    name: 'Demon Lord',
    tier: 6,
    baseCost: 6,
    tags: ['Demon', 'Assassin'],
    baseStats: { hp: 2000, attackDamage: 260, attackSpeed: 1.1 },
    ability: {
      trigger: 'on-kill',
      effect: { buff: { attackDamage: 40, attackSpeed: 0.2 } },
      target: 'self',
    },
  },
  {
    id: 'world-tree',
    name: 'World Tree',
    tier: 6,
    baseCost: 6,
    tags: ['Elf', 'Druid', 'Knight'],
    baseStats: { hp: 3000, attackDamage: 120, attackSpeed: 0.5, range: 2 },
    ability: {
      trigger: 'at-round-start',
      effect: { buff: { hp: 300, attackDamage: 20 } },
      target: 'all-friends',
    },
  },
];

export const UNIT_IDS = UNITS.map((u) => u.id) as readonly string[];

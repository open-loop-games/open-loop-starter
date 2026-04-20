import type { WeaponDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-level growth profiles. Each weapon carries a 7-entry delta sequence
// (level 1 → level 8) per growth axis. Growth arrays are additive indexes
// into `baseDamage` (damageMul = multiplier; 1.0 = no change).
//
// Balance defaults target Vampire Survivors-shape pacing: first weapon
// reaches level 8 in the 4–12 min window (beat 3 in survivor.md § 4).

const GROWTH_DAMAGE_STANDARD: number[] = [1.0, 1.15, 1.3, 1.5, 1.7, 1.9, 2.2];
const GROWTH_DAMAGE_HEAVY: number[] = [1.0, 1.25, 1.5, 1.8, 2.2, 2.6, 3.0];
const GROWTH_COOLDOWN_STANDARD: number[] = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
const GROWTH_PROJECTILES_PER_4: number[] = [0, 1, 1, 2, 2, 3, 3];
const GROWTH_AREA_STANDARD: number[] = [1.0, 1.1, 1.2, 1.3, 1.45, 1.6, 1.8];

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 8 weapon archetypes — spans VS's firing-pattern taxonomy (arc, projectile,
// orbital, area, cross). Gothic horror theme baked inline (survivor.md § 11
// Theme A). Forks override names in place and add weapons by appending.

export const WEAPONS: WeaponDef[] = [
  // Whip — horizontal arc, baseline melee.
  {
    id: 'whip',
    name: 'Whip',
    baseDamage: 10,
    baseCooldownSec: 1.4,
    firing: { pattern: 'arc', projectileCount: 1 },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      projectileBonus: GROWTH_PROJECTILES_PER_4,
    },
    evolvesInto: { evolvedId: 'bloody-tear', requiresPassiveId: 'hollow-heart' },
  },

  // Magic Wand — homing projectile, fast cadence.
  {
    id: 'magic-wand',
    name: 'Magic Wand',
    baseDamage: 6,
    baseCooldownSec: 0.35,
    firing: { pattern: 'projectile', projectileCount: 1, targeting: 'nearest' },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      cooldownMul: GROWTH_COOLDOWN_STANDARD,
    },
    evolvesInto: { evolvedId: 'holy-wand', requiresPassiveId: 'empty-tome' },
  },

  // Garlic — damage ring around player, continuous tick.
  {
    id: 'garlic',
    name: 'Garlic',
    baseDamage: 3,
    baseCooldownSec: 1.0,
    firing: { pattern: 'area', areaRadius: 2.5 },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      areaMul: GROWTH_AREA_STANDARD,
    },
    evolvesInto: { evolvedId: 'soul-eater', requiresPassiveId: 'pummarola' },
  },

  // King Bible — orbital, passes through enemies.
  {
    id: 'king-bible',
    name: 'King Bible',
    baseDamage: 12,
    baseCooldownSec: 5.0,
    firing: { pattern: 'orbital', projectileCount: 1, areaRadius: 3.5 },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_HEAVY,
      projectileBonus: GROWTH_PROJECTILES_PER_4,
    },
    evolvesInto: { evolvedId: 'unholy-vespers', requiresPassiveId: 'spellbinder' },
  },

  // Knife — forward-throw burst.
  {
    id: 'knife',
    name: 'Knife',
    baseDamage: 5,
    baseCooldownSec: 0.5,
    firing: { pattern: 'projectile', projectileCount: 1, targeting: 'fixed-direction' },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      projectileBonus: GROWTH_PROJECTILES_PER_4,
    },
    evolvesInto: { evolvedId: 'thousand-edge', requiresPassiveId: 'bracer' },
  },

  // Axe — lobbed AoE.
  {
    id: 'axe',
    name: 'Axe',
    baseDamage: 18,
    baseCooldownSec: 2.5,
    firing: { pattern: 'area', projectileCount: 1, areaRadius: 1.5 },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_HEAVY,
      areaMul: GROWTH_AREA_STANDARD,
    },
  },

  // Cross — boomerang projectile.
  {
    id: 'cross',
    name: 'Cross',
    baseDamage: 9,
    baseCooldownSec: 1.2,
    firing: { pattern: 'cross', projectileCount: 1, targeting: 'nearest' },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      projectileBonus: GROWTH_PROJECTILES_PER_4,
    },
  },

  // Lightning Ring — area burst.
  {
    id: 'lightning-ring',
    name: 'Lightning Ring',
    baseDamage: 15,
    baseCooldownSec: 2.0,
    firing: { pattern: 'area', projectileCount: 3, areaRadius: 2.0 },
    levelGrowth: {
      damageMul: GROWTH_DAMAGE_STANDARD,
      projectileBonus: GROWTH_PROJECTILES_PER_4,
    },
  },
];

export const WEAPON_IDS = WEAPONS.map((w) => w.id) as readonly string[];

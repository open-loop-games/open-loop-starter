import type { EvolutionDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Evolution damage multipliers are applied relative to the level-8 base
// weapon. 3.0× is the VS-typical step; forks tune per-pairing.

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 5 evolution pairings. Each binds one weapon.evolvesInto ↔ one passive.
// Count matches survivor.md § 8 density target.

export const EVOLUTIONS: EvolutionDef[] = [
  {
    id: 'bloody-tear',
    name: 'Bloody Tear',
    baseWeaponId: 'whip',
    requiresPassiveId: 'hollow-heart',
    firing: { pattern: 'arc', projectileCount: 2 },
    damageMul: 3.0,
  },
  {
    id: 'holy-wand',
    name: 'Holy Wand',
    baseWeaponId: 'magic-wand',
    requiresPassiveId: 'empty-tome',
    firing: { pattern: 'projectile', projectileCount: 8, targeting: 'nearest' },
    damageMul: 2.5,
  },
  {
    id: 'soul-eater',
    name: 'Soul Eater',
    baseWeaponId: 'garlic',
    requiresPassiveId: 'pummarola',
    firing: { pattern: 'area', areaRadius: 5.0 },
    damageMul: 3.5,
  },
  {
    id: 'unholy-vespers',
    name: 'Unholy Vespers',
    baseWeaponId: 'king-bible',
    requiresPassiveId: 'spellbinder',
    firing: { pattern: 'orbital', projectileCount: 5, areaRadius: 4.5 },
    damageMul: 2.8,
  },
  {
    id: 'thousand-edge',
    name: 'Thousand Edge',
    baseWeaponId: 'knife',
    requiresPassiveId: 'bracer',
    firing: { pattern: 'projectile', projectileCount: 5, targeting: 'fixed-direction' },
    damageMul: 3.2,
  },
];

export const EVOLUTION_IDS = EVOLUTIONS.map((e) => e.id) as readonly string[];

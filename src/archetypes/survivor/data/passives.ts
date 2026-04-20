import type { PassiveDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-level passive baseline scales additively: level N applies baseEffect
// times N. 5 levels per passive (VS convention).

export const PASSIVE_MAX_LEVEL = 5;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 6 passives — one per evolution pairing in the skeleton, matching the
// 6-passive-slot cap. Gothic horror theme baked inline.

export const PASSIVES: PassiveDef[] = [
  // Hollow Heart — +max HP. Whip → Bloody Tear prerequisite.
  {
    id: 'hollow-heart',
    name: 'Hollow Heart',
    baseEffect: { hpMul: 1.1 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },

  // Empty Tome — -cooldown. Magic Wand → Holy Wand prerequisite.
  {
    id: 'empty-tome',
    name: 'Empty Tome',
    baseEffect: { cooldownMul: 0.92 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },

  // Pummarola — +regen. Garlic → Soul Eater prerequisite.
  {
    id: 'pummarola',
    name: 'Pummarola',
    baseEffect: { regenPerSec: 0.5 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },

  // Spellbinder — +weapon duration (area/cooldown proxy). King Bible → Unholy Vespers.
  {
    id: 'spellbinder',
    name: 'Spellbinder',
    baseEffect: { areaMul: 1.1 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },

  // Bracer — +projectile speed. Knife → Thousand Edge.
  {
    id: 'bracer',
    name: 'Bracer',
    baseEffect: { projectileSpeedMul: 1.1 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },

  // Attractorb — +magnet radius.
  {
    id: 'attractorb',
    name: 'Attractorb',
    baseEffect: { magnetRadius: 0.5 },
    maxLevel: PASSIVE_MAX_LEVEL,
  },
];

export const PASSIVE_IDS = PASSIVES.map((p) => p.id) as readonly string[];

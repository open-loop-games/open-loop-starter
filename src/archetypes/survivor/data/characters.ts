import type { CharacterDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Passive bonuses are applied at run start; they stack multiplicatively with
// passives picked up in-run. Balance targets a ~10–15% swing between
// characters — enough to seed distinct build directions without dominating
// the Power-Up compound.

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 3 characters — default, damage-focused, survival-focused. Character as
// build-seed (survivor.md § 2). Gothic horror theme baked inline.

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'antonio',
    name: 'Antonio',
    startingWeaponId: 'whip',
    passiveBonus: { damageMul: 1.05 },
    unlock: { kind: 'default' },
  },
  {
    id: 'imelda',
    name: 'Imelda',
    startingWeaponId: 'magic-wand',
    passiveBonus: { luck: 0.1 },
    unlock: { kind: 'default' },
  },
  {
    id: 'pasqualina',
    name: 'Pasqualina',
    startingWeaponId: 'cross',
    passiveBonus: { hpMul: 1.1 },
    unlock: { kind: 'gold-purchase', goldCost: 2000 },
  },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id) as readonly string[];

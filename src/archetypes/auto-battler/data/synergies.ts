import type { SynergyDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Synergy-threshold magnitudes follow the Dota Auto Chess canonical schedule
// — 2/4/6 activation counts for most Species, 3/6 for most Classes. Per-
// threshold effect magnitudes are the `synergy-threshold-bonus` probe's
// perturbation target in auto-battler.md § 6.

export const SYNERGY_ARMOR_LOW = 15;
export const SYNERGY_ARMOR_MID = 35;
export const SYNERGY_ARMOR_HIGH = 65;

export const SYNERGY_DAMAGE_MUL_LOW = 1.1;
export const SYNERGY_DAMAGE_MUL_MID = 1.2;
export const SYNERGY_DAMAGE_MUL_HIGH = 1.4;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 11 synergy families — 6 Species + 5 Classes. Each synergy's thresholds
// match DAC's canonical 2/4/6 (Species) or 3/6 (Classes) activation counts
// for recognisable surface behaviour. Forks override thresholds + effect
// magnitudes in place to retune the compositional surface.

export const SYNERGIES: SynergyDef[] = [
  // ─── Species ───────────────────────────────────────────────────────────

  {
    tag: 'Human',
    thresholds: [
      { count: 2, effect: { hpMul: 1.1 } },
      { count: 4, effect: { hpMul: 1.2 } },
      { count: 6, effect: { hpMul: 1.35 }, globalEffect: { damageMul: SYNERGY_DAMAGE_MUL_LOW } },
    ],
  },
  {
    tag: 'Elf',
    thresholds: [
      { count: 2, effect: { attackSpeedMul: 1.15 } },
      { count: 4, effect: { attackSpeedMul: 1.3 } },
      { count: 6, effect: { attackSpeedMul: 1.5 } },
    ],
  },
  {
    tag: 'Beast',
    thresholds: [
      { count: 2, effect: { damageMul: SYNERGY_DAMAGE_MUL_LOW } },
      { count: 4, effect: { damageMul: SYNERGY_DAMAGE_MUL_MID } },
      { count: 6, effect: { damageMul: SYNERGY_DAMAGE_MUL_HIGH } },
    ],
  },
  {
    tag: 'Dragon',
    thresholds: [
      // Dragons are intentionally rare (only 2 in the roster) — a 2-threshold
      // synergy that fires relatively early reflects DAC canonical design.
      { count: 2, effect: { damageMul: SYNERGY_DAMAGE_MUL_MID, attackSpeedMul: 1.2 } },
    ],
  },
  {
    tag: 'Demon',
    thresholds: [
      { count: 2, effect: { damageMul: SYNERGY_DAMAGE_MUL_LOW, armor: -5 } },
      { count: 4, effect: { damageMul: SYNERGY_DAMAGE_MUL_MID, armor: -10 } },
    ],
  },
  {
    tag: 'Undead',
    thresholds: [
      // Placeholder — no Undead units shipped in the Theme A skeleton; the
      // synergy definition exists so forks adding Undead units can cite the
      // same threshold shape. Validator reads synergy tags, so this stays
      // harmless with zero active Undead units in the default roster.
      { count: 2, effect: { armor: -10 } },
      { count: 4, effect: { armor: -20 } },
    ],
  },

  // ─── Classes ───────────────────────────────────────────────────────────

  {
    tag: 'Warrior',
    thresholds: [
      { count: 3, effect: { hpMul: 1.15, damageMul: SYNERGY_DAMAGE_MUL_LOW } },
      { count: 6, effect: { hpMul: 1.4, damageMul: SYNERGY_DAMAGE_MUL_MID } },
    ],
  },
  {
    tag: 'Knight',
    thresholds: [
      { count: 2, effect: { armor: SYNERGY_ARMOR_LOW } },
      { count: 4, effect: { armor: SYNERGY_ARMOR_MID } },
      { count: 6, effect: { armor: SYNERGY_ARMOR_HIGH } },
    ],
  },
  {
    tag: 'Mage',
    thresholds: [
      { count: 3, effect: { damageMul: SYNERGY_DAMAGE_MUL_MID } },
      { count: 6, effect: { damageMul: SYNERGY_DAMAGE_MUL_HIGH } },
    ],
  },
  {
    tag: 'Assassin',
    thresholds: [
      { count: 3, effect: { damageMul: SYNERGY_DAMAGE_MUL_LOW, attackSpeedMul: 1.15 } },
      { count: 6, effect: { damageMul: SYNERGY_DAMAGE_MUL_MID, attackSpeedMul: 1.3 } },
    ],
  },
  {
    tag: 'Druid',
    thresholds: [
      { count: 2, effect: { hpMul: 1.15 } },
      { count: 4, effect: { hpMul: 1.3 } },
    ],
  },
];

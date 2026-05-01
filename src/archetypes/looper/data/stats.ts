import { Decimal, type DecimalSource } from 'open-loop-engine';
import type { StatDef } from './types';

// ─── Skeleton ───
// 9 stats from vanilla idle-loops, single-axis registry. The canonical Level
// + Talent two-tier role split (Level resets per loop and reduces cost;
// Talent persists and multiplies XP rate) lives in `modules/stats.ts` —
// data carries only typed identity. Forks adding skills/soulstones/buffs
// register additional categories on top; the foundation stays single-axis.
//
// ─── Balance ───
// Stat ids carried 1:1 from `idle-loops-ng/src/data/stats.ts:20` `statList`
// constant. PascalCase 3-letter abbreviations serve as both id and short
// display name — the canonical engine-keyed identifiers across vanilla
// idle-loops, idle-loops-ng, and every fork. Description strings are
// looper-side full-name flavor; forks override.

export const STATS: StatDef[] = [
  { id: 'Dex', name: 'Dex', description: 'Dexterity — fine-motor skill, agility, reflex.' },
  { id: 'Str', name: 'Str', description: 'Strength — raw physical power, carrying capacity.' },
  { id: 'Con', name: 'Con', description: 'Constitution — endurance, resistance, stamina.' },
  { id: 'Spd', name: 'Spd', description: 'Speed — movement and reaction time.' },
  { id: 'Per', name: 'Per', description: 'Perception — senses, attention, awareness.' },
  { id: 'Cha', name: 'Cha', description: 'Charisma — social presence, persuasion.' },
  { id: 'Int', name: 'Int', description: 'Intelligence — analysis, deduction, study.' },
  { id: 'Luck', name: 'Luck', description: 'Luck — favorable variance.' },
  { id: 'Soul', name: 'Soul', description: 'Soul — spirit, willpower, resolve.' },
];

// ─── Level Formulas ───
// Shared quadratic level formula from vanilla idle-loops.
// Reference: idle-loops-ng/src/data/stats.ts

/**
 * Quadratic level from XP: `floor((sqrt(8 * xp / 100 + 1) - 1) / 2)`
 *
 * Used for stat levels and talent levels.
 * Reference: idleLoops/stats.js getLevelFromExp / getLevelFromTalent
 */
export function levelFromXP(xp: DecimalSource): Decimal {
  return Decimal.floor(
    Decimal.div(
      Decimal.sub(Decimal.sqrt(Decimal.add(Decimal.mul(8, Decimal.div(xp, 100)), 1)), 1),
      2,
    ),
  );
}

/**
 * XP required to reach a given level: `level * (level + 1) * 50`
 *
 * Reference: idleLoops/stats.js getExpOfLevel / getExpOfTalent
 */
export function xpForLevel(level: DecimalSource): Decimal {
  return Decimal.mul(Decimal.mul(level, Decimal.add(level, 1)), 50);
}

/**
 * Talent level → XP multiplier: `1 + talent^0.5 / 5`
 *
 * Reference: idleLoops/actions.js calcTalentMult
 */
export function calcTalentMult(talentLevel: DecimalSource): Decimal {
  return Decimal.add(1, Decimal.div(Decimal.pow(talentLevel, 0.5), 5));
}

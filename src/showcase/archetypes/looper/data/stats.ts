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
//
// Formula helpers (`levelFromXP`, `xpForLevel`, `calcTalentMult`) live in
// `modules/stats.ts`: they're compute logic, not config, and require runtime
// engine surfaces (Decimal). Data layer stays runtime-import-free per
// AUDITING.md § 1.

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

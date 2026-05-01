import type { CapabilityDef } from './types';

// ─── Skeleton ───
// 9 stats from vanilla idle-loops, single-axis registry. The canonical Level
// + Talent two-tier role split (Level resets per loop and reduces cost;
// Talent persists and multiplies XP rate) lives in `modules/capabilities.ts`
// — data carries only typed identity. Forks adding skills/soulstones/buffs
// register additional categories on top; the foundation stays single-axis.
//
// ─── Balance ───
// Stat ids carried 1:1 from `idle-loops-ng/src/data/stats.ts:20` `statList`
// constant. PascalCase 3-letter abbreviations serve as both id and short
// display name — the canonical engine-keyed identifiers across vanilla
// idle-loops, idle-loops-ng, and every fork. Description strings are
// looper-side full-name flavor; forks override.
//
// Open question: the slim demo doesn't yet model talents-as-XP-multiplier
// (`calcTalentMult` in `idle-loops-ng/src/data/stats.ts:81`), soulstones, or
// the skill-level-driven cost discounts that vanilla applies on Practical
// (Smash Pots, Wild Mana) and Hermit (Gather Herbs). Those are mechanics-
// layer features tracked under the looper-port followup.

export const CAPABILITIES: CapabilityDef[] = [
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

import type { SkillDef } from './types';

// ─── Skeleton ───
// 5 skills, two-tier (gen + instinct) per skill. The two-tier wiring lives in
// `modules/skills.ts` via `createSkillCategory.mapSkill`; data-side carries
// only the typed identity.

// ─── Costume ───
// Theme A — Classic Adventuring (idle-loops vanilla shape; descriptions
// abbreviated from the lineage).

export const SKILLS: SkillDef[] = [
  {
    id: 'combat',
    name: 'Combat',
    description: 'Fight for your lives.',
  },
  {
    id: 'magic',
    name: 'Magic',
    description: 'Control the aether to cast and conjure.',
  },
  {
    id: 'practical',
    name: 'Practical Magic',
    description: 'Useful tricks: Mage Hand, Prestidigitation, Detect Magic.',
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    description: 'Brewing potions is hard, careful work.',
  },
  {
    id: 'crafting',
    name: 'Crafting',
    description: 'Hands-on physical work — wood, stone, leather, steel.',
  },
];

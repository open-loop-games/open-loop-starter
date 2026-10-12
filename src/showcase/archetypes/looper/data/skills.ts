// ─── Skeleton ───
// The four skills of the parallel track. Every action carries a weight vector
// over them (`./route.ts`), so a skill trains as a side effect of whatever the
// plan runs, never as a separate selection. Their curves are in `./spine.ts`.

export type SkillId = 'brawn' | 'stealth' | 'finesse' | 'guile';

export interface SkillDef {
  id: SkillId;
  displayName: string;
  /** one-line flavor for the skill panel */
  blurb: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'brawn', displayName: 'Brawn', blurb: 'lifting, bending, hauling yourself up' },
  {
    id: 'stealth',
    displayName: 'Stealth',
    blurb: 'soft feet, slow breath, the dark side of the lamp',
  },
  { id: 'finesse', displayName: 'Finesse', blurb: 'wire, tumblers, light fingers' },
  { id: 'guile', displayName: 'Guile', blurb: 'the story you tell and the smokes behind it' },
];

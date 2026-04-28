import type { ZoneDef } from './types';

// ─── Skeleton ───
// 4 zones in linear-unlock order. Zone 0 is initiallyUnlocked; zones 1–3 carry
// `requires` predicates evaluated by `modules/zones.ts`'s watch-and-bridge.
// AND across all entries in `requires`. Threshold values are placeholders for
// the balance leaf (OL-737) to bisect against beat-5 windowing.

// ─── Costume ───
// Theme A — Classic Adventuring zone ladder (Beginnersville → Forest Path →
// Merchanton → Ruined Keep).

export const ZONES: ZoneDef[] = [
  {
    id: 'beginnersville',
    name: 'Beginnersville',
    description: 'A sleepy village. Every loop begins here.',
    requires: [],
  },
  {
    id: 'forest-path',
    name: 'Forest Path',
    description: 'A winding road between the towns.',
    requires: [{ trigger: 'action-completion-count', actionId: 'wander', value: 50 }],
  },
  {
    id: 'merchanton',
    name: 'Merchanton',
    description: 'A bustling merchant city full of apprenticeships.',
    requires: [{ trigger: 'action-completion-count', actionId: 'forest-walk', value: 30 }],
  },
  {
    id: 'ruined-keep',
    name: 'Ruined Keep',
    description: 'Crumbling stone, restless dead, the deepest secrets.',
    requires: [{ trigger: 'skill-level', skillId: 'combat', tier: 'gen', value: 25 }],
  },
];

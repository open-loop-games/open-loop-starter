// ─── Skeleton ───
// Notes Under the Bunk: what Intel buys between nights. Prices are in
// `./spine.ts` (`NOTE_PRICES`), because the arc prediction buys from them.

import type { NoteId } from './spine';

export interface NoteDef {
  id: NoteId;
  displayName: string;
  description: string;
  /** note that must be owned before this one shows */
  after?: NoteId;
}

export const NOTES: NoteDef[] = [
  {
    id: 'steel-nerves',
    displayName: 'Steel Nerves',
    description: 'Every night lasts longer: +Nerve per level.',
  },
  {
    id: 'grapevine',
    displayName: 'The Grapevine',
    description: 'Rumors of patrol timings: every action runs faster.',
  },
  {
    id: 'deja-vu',
    displayName: 'Déjà Vu',
    description: 'You have lived this night before. Unlocks a faster clock.',
  },
  {
    id: 'routine',
    displayName: 'Routine',
    description: 'Lights out, and you are already moving: nights begin on their own.',
  },
  {
    id: 'discipline',
    displayName: 'Discipline',
    description: 'When the plan runs out, lie down before the guard finds you standing.',
    after: 'routine',
  },
];

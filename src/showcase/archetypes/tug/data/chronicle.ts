// ─── Skeleton ───
// Boons of the Crown: what a volume of the Chronicle buys, one boon a volume. Each strength
// boon multiplies one of the player keep's chains; the Charter of the Longbow opens a troop.

export interface BoonDef {
  id: string;
  name: string;
  blurb: string;
  /** Most levels it takes. */
  limit: number;
  /** Chronicle volume it waits for. */
  minVolume: number;
  /** The player keep's chain each level multiplies; none for a charter. */
  chain?: 'income' | 'vigor' | 'gate';
}

export const BOONS: BoonDef[] = [
  {
    id: 'longbow',
    name: 'Charter of the Longbow',
    blurb: 'Raise the Bowmen of the Shire.',
    limit: 1,
    minVolume: 1,
  },
  {
    id: 'fields',
    name: 'Fertile Fields',
    blurb: 'More silver from every harvest.',
    limit: 5,
    minVolume: 0,
    chain: 'income',
  },
  {
    id: 'levies',
    name: 'Drilled Levies',
    blurb: "Every man's grit and blows.",
    limit: 5,
    minVolume: 0,
    chain: 'vigor',
  },
  {
    id: 'curtain',
    name: 'Stone Curtain',
    blurb: "Fairhold's gate holds longer.",
    limit: 3,
    minVolume: 0,
    chain: 'gate',
  },
];

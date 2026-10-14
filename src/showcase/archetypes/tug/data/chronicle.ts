// ─── Skeleton ───
// Boons of the Crown: what a volume of the Chronicle buys, one boon a volume. Each strength
// boon multiplies one of the player keep's chains; a weapon boon opens a kind for the walls.

export interface BoonDef {
  id: string;
  name: string;
  blurb: string;
  /** Most levels it takes; a strength boon has none, so a run of defeats always buys a way through. */
  limit?: number;
  /** Chronicle volume it waits for. */
  minVolume: number;
  /** The player keep's chain each level multiplies; none for a weapon. */
  chain?: 'income' | 'vigor' | 'gate';
}

export const BOONS: BoonDef[] = [
  {
    id: 'fields',
    name: 'Fertile Fields',
    blurb: 'More silver from every harvest.',
    minVolume: 0,
    chain: 'income',
  },
  {
    id: 'levies',
    name: 'Drilled Levies',
    blurb: "Every man's grit and blows.",
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
  {
    id: 'trebuchet',
    name: 'the Trebuchet',
    blurb: 'Mount a trebuchet on the walls: a stone on their foremost ranks.',
    limit: 1,
    minVolume: 2,
  },
  {
    id: 'firepots',
    name: 'Fire-pots',
    blurb: 'Pots of pitch for the walls: burn the engine nearest our gate.',
    limit: 1,
    minVolume: 6,
  },
];

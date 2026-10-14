// ─── Skeleton ───
// The rock and what stands on it: a 5×5 board with the tower at its centre, a yard ring
// around the tower and a shore ring around the yard. The pieces are bought with salvage by
// day, and taking one up refunds its price in full. The tide leaves finds at dawn: three are
// offered, one is taken, and the rest wash back out at dusk.

export type PieceKind = 'breakwater' | 'net' | 'buttress' | 'screen' | 'winch';
/** Shore: the outer ring, where the sea breaks. Yard: the ring around the tower. */
export type Ground = 'shore' | 'yard';
export type Quarter = 'N' | 'E' | 'S' | 'W';

export interface PieceDef {
  id: PieceKind;
  name: string;
  ground: Ground;
  blurb: string;
}

export const PIECES: readonly PieceDef[] = [
  {
    id: 'breakwater',
    name: 'Breakwater',
    ground: 'shore',
    blurb: 'Turns the sea aside. Braced by breakwaters beside it.',
  },
  {
    id: 'net',
    name: 'Tide net',
    ground: 'shore',
    blurb: 'Catches wrack; holds it until you haul it in.',
  },
  {
    id: 'buttress',
    name: 'Buttress',
    ground: 'yard',
    blurb: 'Stiffens every breakwater it touches, corners too.',
  },
  {
    id: 'screen',
    name: 'Spray screen',
    ground: 'yard',
    blurb: 'Takes the spray that goes over the walls, on every quarter it faces.',
  },
  {
    id: 'winch',
    name: 'Winch',
    ground: 'yard',
    blurb: 'Hauls in every net it touches, day and night.',
  },
];

export const QUARTERS: readonly Quarter[] = ['N', 'E', 'S', 'W'];

export const QUARTER_NAME: Record<Quarter, string> = {
  N: 'north',
  E: 'east',
  S: 'south',
  W: 'west',
};

export type FindId = 'timbers' | 'oakum' | 'brass' | 'cork' | 'glass';

/** What the tide leaves at dawn. */
export interface FindDef {
  id: FindId;
  name: string;
  blurb: string;
  /** Draw weight in the dawn offer. */
  weight: number;
}

export const FINDS: readonly FindDef[] = [
  { id: 'timbers', name: "Ship's timbers", blurb: 'Salvage to spend now.', weight: 3 },
  { id: 'oakum', name: 'Tar & oakum', blurb: 'Mend a quarter of the tower.', weight: 2 },
  {
    id: 'brass',
    name: 'Brass fittings',
    blurb: 'All breakwaters ward +5% for this posting.',
    weight: 2,
  },
  { id: 'cork', name: 'Cork floats', blurb: 'Nets hold +50% for this posting.', weight: 2 },
  { id: 'glass', name: 'Storm glass', blurb: "Tonight's storm arrives 20% weaker.", weight: 1 },
];

/** Finds offered each dawn. */
export const OFFER_SIZE = 3;

// ─── Balance ───
// What one find is worth. Timbers is priced in the spine (`./spine.ts` § ANCHORS
// `timbersInCycles`), because it is salvage; these are ratios on the run.
//   oakum  — a share of the tower's integrity mended
//   brass  — ward per find taken, run-local: the peg does not see it
//   cork   — net capacity per find taken
//   glass  — tonight's storm multiplier
export const FIND_EFFECT = { oakum: 0.25, brass: 0.05, cork: 0.5, glass: 0.8 } as const;

// ─── Skeleton ───
// What a Hardpoint hull holds and how it is named: the module types, the relation each
// reads over the lattice, the hull's silhouette and the sections that plate it, and the
// refits. Pure data with no engine refs; every price and strength comes from `./spine.ts`.

import type { BeatId } from './spine';

export type PieceId = 'pulse' | 'capacitor' | 'targeting' | 'beacon' | 'rail' | 'coolant';

/** What a piece does on the board. */
export type PieceRole =
  /** Deals damage; receives every buff. */
  | 'weapon'
  /** Adds a flat boost to each weapon its relation reaches. */
  | 'booster'
  /** Multiplies each weapon its relation reaches. */
  | 'beacon'
  /** Amplifies the outgoing boost of each booster its relation reaches. */
  | 'amplifier';

/** Which neighbour set a piece's effect reaches; the game layer maps each to grid deltas. */
export type RelationId = 'none' | 'orthogonal' | 'corners' | 'knight';

export interface PieceDef {
  id: PieceId;
  name: string;
  glyph: string;
  role: PieceRole;
  /** Neighbour set this piece's effect reaches. `none` for weapons. */
  relation: RelationId;
  /** Name of the relation, for the fitting card. */
  relationName: string;
  /** Beat that unlocks it; absent = available from the start. */
  unlock?: BeatId;
  blurb: string;
}

export const PIECES: readonly PieceDef[] = [
  {
    id: 'pulse',
    name: 'Pulse Cannon',
    glyph: 'P',
    role: 'weapon',
    relation: 'none',
    relationName: 'fires',
    blurb: 'Light energy cannon. Takes every buff that reaches its cell.',
  },
  {
    id: 'capacitor',
    name: 'Capacitor',
    glyph: 'C',
    role: 'booster',
    relation: 'orthogonal',
    relationName: 'edge-adjacent',
    blurb: 'Boosts weapons sharing an edge.',
  },
  {
    id: 'targeting',
    name: 'Targeting Array',
    glyph: 'T',
    role: 'booster',
    relation: 'corners',
    relationName: 'corner-adjacent',
    unlock: 'unlock:targeting',
    blurb: 'Boosts weapons touching its corners — fits where capacitors cannot.',
  },
  {
    id: 'beacon',
    name: 'Arc Beacon',
    glyph: 'A',
    role: 'beacon',
    relation: 'knight',
    relationName: "knight's move",
    unlock: 'unlock:beacon',
    blurb: "Stamps weapons a knight's move away. Stamps add up, then multiply the boosted shot.",
  },
  {
    id: 'rail',
    name: 'Railgun',
    glyph: 'R',
    role: 'weapon',
    relation: 'none',
    relationName: 'fires',
    unlock: 'unlock:rail',
    blurb: 'Heavy kinetic driver. Eight cannons of damage in one cell.',
  },
  {
    id: 'coolant',
    name: 'Coolant Manifold',
    glyph: 'K',
    role: 'amplifier',
    relation: 'orthogonal',
    relationName: 'edge-adjacent',
    unlock: 'unlock:coolant',
    blurb: 'Amplifies every boost an edge-adjacent booster gives out.',
  },
];

export const PIECE_BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p])) as Record<
  PieceId,
  PieceDef
>;

/**
 * The hull lattice. '.' is void, '0' the corvette core open from the start,
 * '1'–'6' the section that plates the cell. Row 0 is the bow.
 */
export const HULL_MAP = [
  '...6...',
  '..222..',
  '.30003.',
  '5100015',
  '5300035',
  '.44.44.',
  '.6...6.',
] as const;
export const HULL_W = 7;
export const HULL_H = 7;

export interface SectionDef {
  id: string;
  /** Section number in HULL_MAP. */
  index: number;
  name: string;
  beat: BeatId;
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'section-1', index: 1, name: 'Midship spars', beat: 'section:1' },
  { id: 'section-2', index: 2, name: 'Bow plating', beat: 'section:2' },
  { id: 'section-3', index: 3, name: 'Flank bulkheads', beat: 'section:3' },
  { id: 'section-4', index: 4, name: 'Aft nacelles', beat: 'section:4' },
  { id: 'section-5', index: 5, name: 'Wing hardpoints', beat: 'section:5' },
  { id: 'section-6', index: 6, name: 'Spine & fins', beat: 'section:6' },
];

export interface RefitDef {
  id: string;
  name: string;
  beat: BeatId;
  blurb: string;
}

export const REFITS: readonly RefitDef[] = [
  {
    id: 'fire-control',
    name: 'Fire-Control Uplink',
    beat: 'refit:fire-control',
    blurb: 'Fleet targeting feed. Every weapon hits harder.',
  },
  {
    id: 'overcharge',
    name: 'Overcharged Feeds',
    beat: 'refit:overcharge',
    blurb: 'Run the reactor past spec. Every weapon hits harder.',
  },
];

/** The section that plates a cell: 0 is the corvette core, -1 is void. */
export function sectionAt(x: number, y: number): number {
  const ch = HULL_MAP[y]![x]!;
  return ch === '.' ? -1 : Number(ch);
}

/** Hull cells a section plates. */
export function cellsInSection(index: number): number {
  return HULL_MAP.join('')
    .split('')
    .filter((c) => c === String(index)).length;
}

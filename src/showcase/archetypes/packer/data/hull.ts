// ─── Skeleton ───
// What the fitter fits and where: the module types and the relation each reads over the
// lattice, the three ships with their hulls, sections, refits and cell tags, the carriers
// that hold the breach line's sectors, and the conditions each sector brings. Pure data
// with no engine refs; every price and strength comes from `./spine.ts`.

export type PieceId =
  | 'pulse'
  | 'capacitor'
  | 'targeting'
  | 'beacon'
  | 'rail'
  | 'coolant'
  | 'director'
  | 'lance'
  | 'tractor';

/** What a piece does on the board. */
export type PieceRole =
  /** Deals damage; receives every buff. */
  | 'weapon'
  /** Adds a flat boost to each weapon its relation reaches. */
  | 'booster'
  /** Multiplies each weapon its relation reaches. */
  | 'beacon'
  /** Amplifies the outgoing boost of each booster its relation reaches. */
  | 'amplifier'
  /** Raises the salvage each weapon it reaches recovers, and adds no firepower. */
  | 'tractor';

/** Which cells a piece's effect reaches; the game layer maps each to grid offsets. */
export type RelationId = 'none' | 'orthogonal' | 'corners' | 'knight' | 'ray';

/** A hull cell's mount tag. */
export type CellTag = 'keel';

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
  unlock?: string;
  /** The only cells it mounts on. */
  mount?: CellTag;
  /** Whether the player turns it: its relation reads its facing. */
  turns?: boolean;
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
    unlock: 'frigate:unlock:targeting',
    blurb: 'Boosts weapons touching its corners — fits where capacitors cannot.',
  },
  {
    id: 'beacon',
    name: 'Arc Beacon',
    glyph: 'A',
    role: 'beacon',
    relation: 'knight',
    relationName: "knight's move",
    unlock: 'frigate:unlock:beacon',
    blurb: "Stamps weapons a knight's move away. Stamps add up, then multiply the boosted shot.",
  },
  {
    id: 'rail',
    name: 'Railgun',
    glyph: 'R',
    role: 'weapon',
    relation: 'none',
    relationName: 'fires',
    unlock: 'frigate:unlock:rail',
    blurb: 'Heavy kinetic driver. Eight cannons of damage in one cell.',
  },
  {
    id: 'coolant',
    name: 'Coolant Manifold',
    glyph: 'K',
    role: 'amplifier',
    relation: 'orthogonal',
    relationName: 'edge-adjacent',
    unlock: 'frigate:unlock:coolant',
    blurb: 'Amplifies every boost an edge-adjacent booster gives out.',
  },
  {
    id: 'director',
    name: 'Fire Director',
    glyph: 'D',
    role: 'booster',
    relation: 'ray',
    relationName: 'the line it faces',
    unlock: 'frigate:unlock:director',
    turns: true,
    blurb: 'Boosts each weapon in the four cells down the line it faces. Turn it to aim.',
  },
  {
    id: 'lance',
    name: 'Spinal Lance',
    glyph: 'L',
    role: 'weapon',
    relation: 'none',
    relationName: 'keel mount only',
    unlock: 'lancer:unlock:lance',
    mount: 'keel',
    blurb: 'A spinal-mount particle lance. Four railguns of damage, but only on the keel.',
  },
  {
    id: 'tractor',
    name: 'Salvage Tractor',
    glyph: 'S',
    role: 'tractor',
    relation: 'orthogonal',
    relationName: 'edge-adjacent',
    unlock: 'lancer:unlock:tractor',
    blurb: 'Raises the salvage edge-adjacent weapons recover. Adds no firepower.',
  },
];

export const PIECE_BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p])) as Record<
  PieceId,
  PieceDef
>;

// ─── The breach line ───

export type ConditionId = 'ion-storm' | 'jamming' | 'coolant-leak' | 'shear' | 'close-quarters';

export interface ConditionDef {
  id: ConditionId;
  name: string;
  blurb: string;
}

/** Each rewrites one relation while its sector holds. */
export const CONDITIONS: readonly ConditionDef[] = [
  {
    id: 'ion-storm',
    name: 'Ion storm',
    blurb: 'Corner links go dark: Targeting Arrays boost nothing.',
  },
  { id: 'jamming', name: 'Jamming', blurb: 'Arc Beacon stamps are halved.' },
  { id: 'coolant-leak', name: 'Coolant leak', blurb: 'Coolant Manifolds amplify nothing.' },
  { id: 'shear', name: 'Magnetic shear', blurb: 'A Fire Director reaches two cells, not four.' },
  {
    id: 'close-quarters',
    name: 'Close quarters',
    blurb: 'A booster with no empty cell beside it runs cold.',
  },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c])) as Record<
  ConditionId,
  ConditionDef
>;

export interface CarrierDef {
  id: string;
  /** The breach-line sector it holds; it falls, and the next sector opens. */
  sector: number;
  name: string;
  ship: ShipId;
  /** The hull section that must be plated before it can be engaged. */
  after: number;
  /** What its sector brings while it holds. */
  conditions: readonly ConditionId[];
}

// ─── Ships ───

export type ShipId = 'frigate' | 'lancer' | 'flagship';

export interface SectionDef {
  id: string;
  ship: ShipId;
  /** Section number in its ship's map. */
  index: number;
  name: string;
}

export interface RefitDef {
  id: string;
  ship: ShipId;
  name: string;
  blurb: string;
}

/** One of a ship's two acts: the beats it schedules and the gap ladder they sit on. */
export interface ActDef {
  name: string;
  /** beat ids in schedule order; a carrier rides the gap of the section before it */
  beats: readonly string[];
  /** first and last gap of the act's ladder, in seconds */
  gaps: readonly [number, number];
}

export interface ShipDef {
  id: ShipId;
  name: string;
  /** hull class of the base hull, then of the extended hull */
  classes: readonly [string, string];
  /**
   * The hull lattice, row 0 the bow. '.' is void, '0' the corvette core, and '1'–'e'
   * (base 36) the section that plates the cell.
   */
  map: readonly string[];
  /** columns tagged keel */
  keel: readonly number[];
  sections: readonly SectionDef[];
  refits: readonly RefitDef[];
  acts: readonly [ActDef, ActDef];
}

export const HULL_W = 11;
export const HULL_H = 13;

const sections = (ship: ShipId, names: readonly string[]): SectionDef[] =>
  names.map((name, i) => ({ id: `${ship}:section-${i + 1}`, ship, index: i + 1, name }));

export const SHIPS: readonly ShipDef[] = [
  {
    id: 'frigate',
    name: 'Hardpoint',
    classes: ['Frigate', 'Cruiser'],
    map: [
      '.....8.....',
      '....878....',
      '...b878b...',
      '....868....',
      '...b222b...',
      '.9b30003b9.',
      '99510001599',
      '99530003599',
      '.9b44744b9.',
      '...6a7a6...',
      '...aa7aa...',
      '....aaa....',
      '...........',
    ],
    keel: [5],
    sections: sections('frigate', [
      'Midship spars',
      'Bow plating',
      'Flank bulkheads',
      'Aft nacelles',
      'Wing hardpoints',
      'Spine & fins',
      'Cruiser keel',
      'Forward battery',
      'Broadside sponsons',
      'Drive block',
      'Dorsal arrays',
    ]),
    refits: [
      {
        id: 'frigate:fire-control',
        ship: 'frigate',
        name: 'Fire-Control Uplink',
        blurb: 'Fleet targeting feed. Every weapon hits harder.',
      },
      {
        id: 'frigate:overcharge',
        ship: 'frigate',
        name: 'Overcharged Feeds',
        blurb: 'Run the reactor past spec. Every weapon hits harder.',
      },
      {
        id: 'frigate:battle-net',
        ship: 'frigate',
        name: 'Battle Network',
        blurb: 'Cruiser-grade fire control. Every weapon hits harder.',
      },
    ],
    acts: [
      {
        name: 'The frigate',
        beats: [
          'frigate:unlock:targeting',
          'frigate:section-1',
          'frigate:section-2',
          'frigate:refit:fire-control',
          'frigate:unlock:beacon',
          'frigate:section-3',
          'frigate:unlock:rail',
          'frigate:section-4',
          'frigate:unlock:coolant',
          'frigate:refit:overcharge',
          'frigate:section-5',
          'frigate:section-6',
        ],
        gaps: [40, 150],
      },
      {
        name: 'The cruiser',
        beats: [
          'frigate:section-7',
          'frigate:unlock:director',
          'frigate:section-8',
          'carrier:brood',
          'frigate:section-9',
          'frigate:refit:battle-net',
          'frigate:section-10',
          'frigate:section-11',
          'carrier:lamprey',
        ],
        gaps: [150, 210],
      },
    ],
  },
  {
    id: 'lancer',
    name: 'Longreach',
    classes: ['Lancer', 'Heavy Lancer'],
    map: [
      '.....9.....',
      '....898....',
      '....878....',
      '...68786...',
      '...45254...',
      '..a10001a..',
      '..a10001a..',
      '..a30003a..',
      '...45254...',
      '...b636b...',
      '..bb666bb..',
      '...ccccc...',
      '.....c.....',
    ],
    keel: [5],
    sections: sections('lancer', [
      'Keel spars',
      'Spinal cradle',
      'Aft cradle',
      'Flank mounts',
      'Prow mounts',
      'Lance gallery',
      'Spinal extension',
      'Prow battery',
      'Ram prow',
      'Outrigger hulls',
      'Tractor sponsons',
      'Drive cluster',
    ]),
    refits: [
      {
        id: 'lancer:capacitor-banks',
        ship: 'lancer',
        name: 'Capacitor Banks',
        blurb: 'Deeper reserves. Every weapon hits harder.',
      },
      {
        id: 'lancer:focusing',
        ship: 'lancer',
        name: 'Focusing Optics',
        blurb: 'Tighter beams. Every weapon hits harder.',
      },
    ],
    acts: [
      {
        name: 'The lancer',
        beats: [
          'lancer:section-1',
          'lancer:unlock:lance',
          'lancer:section-2',
          'lancer:refit:capacitor-banks',
          'lancer:section-3',
          'carrier:siege',
          'lancer:section-4',
          'lancer:section-5',
          'carrier:maw',
        ],
        gaps: [90, 180],
      },
      {
        name: 'The heavy lancer',
        beats: [
          'lancer:section-6',
          'lancer:unlock:tractor',
          'lancer:section-7',
          'lancer:section-8',
          'carrier:shrike',
          'lancer:section-9',
          'lancer:refit:focusing',
          'lancer:section-10',
          'lancer:section-11',
          'lancer:section-12',
          'carrier:warden',
        ],
        gaps: [180, 270],
      },
    ],
  },
  {
    id: 'flagship',
    name: 'Sovereign',
    classes: ['Battleship', 'Flagship'],
    map: [
      '....9.9....',
      '...89898...',
      '..a87278a..',
      '.aa62226aa.',
      '.d5312135d.',
      'dd5100015dd',
      'dd4100014dd',
      '.d4100014d.',
      '.bb63336bb.',
      '..bc777cb..',
      '...cc7cc...',
      '....eee....',
      '...........',
    ],
    keel: [4, 6],
    sections: sections('flagship', [
      'Citadel',
      'Twin keels',
      'Flank armour',
      'Aft citadel',
      'Battery decks',
      'Upper decks',
      'Keel extensions',
      'Forward towers',
      'Prow guns',
      'Wing batteries',
      'Stern galleries',
      'Drive spires',
      'Outer belt',
      'Flag bridge',
    ]),
    refits: [
      {
        id: 'flagship:fleet-link',
        ship: 'flagship',
        name: 'Fleet Link',
        blurb: 'The whole line feeds your guns. Every weapon hits harder.',
      },
      {
        id: 'flagship:last-stand',
        ship: 'flagship',
        name: 'Last Stand Protocols',
        blurb: 'Every safety off. Every weapon hits harder.',
      },
    ],
    acts: [
      {
        name: 'The battleship',
        beats: [
          'flagship:section-1',
          'flagship:section-2',
          'flagship:refit:fleet-link',
          'flagship:section-3',
          'carrier:hive-mother',
          'flagship:section-4',
          'flagship:section-5',
          'flagship:section-6',
          'carrier:null-ark',
        ],
        gaps: [150, 240],
      },
      {
        name: 'The flagship',
        beats: [
          'flagship:section-7',
          'flagship:section-8',
          'flagship:section-9',
          'carrier:breach-mother',
          'flagship:section-10',
          'flagship:refit:last-stand',
          'flagship:section-11',
          'flagship:section-12',
          'flagship:section-13',
          'flagship:section-14',
          'carrier:dreadnought',
        ],
        gaps: [240, 300],
      },
    ],
  },
];

export const SHIP_BY_ID = Object.fromEntries(SHIPS.map((s) => [s.id, s])) as Record<
  ShipId,
  ShipDef
>;

/** The authored carriers, one a sector, in breach-line order. */
export const CARRIERS: readonly CarrierDef[] = [
  {
    id: 'carrier:brood',
    sector: 1,
    name: 'Brood Carrier',
    ship: 'frigate',
    after: 8,
    conditions: ['ion-storm'],
  },
  {
    id: 'carrier:lamprey',
    sector: 2,
    name: 'Lamprey Tender',
    ship: 'frigate',
    after: 11,
    conditions: ['jamming'],
  },
  {
    id: 'carrier:siege',
    sector: 3,
    name: 'Siege Hive',
    ship: 'lancer',
    after: 3,
    conditions: ['coolant-leak'],
  },
  {
    id: 'carrier:maw',
    sector: 4,
    name: 'The Maw',
    ship: 'lancer',
    after: 5,
    conditions: ['shear'],
  },
  {
    id: 'carrier:shrike',
    sector: 5,
    name: 'Shrike Nest',
    ship: 'lancer',
    after: 8,
    conditions: ['close-quarters'],
  },
  {
    id: 'carrier:warden',
    sector: 6,
    name: 'Swarm Warden',
    ship: 'lancer',
    after: 12,
    conditions: ['ion-storm'],
  },
  {
    id: 'carrier:hive-mother',
    sector: 7,
    name: 'Hive Mother',
    ship: 'flagship',
    after: 3,
    conditions: ['jamming', 'coolant-leak'],
  },
  {
    id: 'carrier:null-ark',
    sector: 8,
    name: 'Null Ark',
    ship: 'flagship',
    after: 6,
    conditions: ['close-quarters'],
  },
  {
    id: 'carrier:breach-mother',
    sector: 9,
    name: 'Breach Mother',
    ship: 'flagship',
    after: 9,
    conditions: ['shear', 'ion-storm'],
  },
  {
    id: 'carrier:dreadnought',
    sector: 10,
    name: 'The Dreadnought',
    ship: 'flagship',
    after: 14,
    conditions: ['ion-storm', 'jamming'],
  },
];

export const CARRIER_BY_ID = Object.fromEntries(CARRIERS.map((c) => [c.id, c])) as Record<
  string,
  CarrierDef
>;

/**
 * The carrier a ship's schedule puts between a section and the plate before it, which must
 * fall before the section can be plated; undefined when none does.
 */
export function carrierBefore(sectionId: string): CarrierDef | undefined {
  const ship = SHIP_BY_ID[sectionId.slice(0, sectionId.indexOf(':')) as ShipId];
  const beats = ship.acts.flatMap((a) => a.beats);
  for (let i = beats.indexOf(sectionId) - 1; i >= 0; i--) {
    if (beats[i]!.includes(':section-')) return undefined;
    if (beats[i]!.startsWith('carrier:')) return CARRIER_BY_ID[beats[i]!];
  }
  return undefined;
}

/** The section that plates a cell of a ship's hull: 0 is the corvette core, -1 is void. */
export function sectionAt(ship: ShipId, x: number, y: number): number {
  const ch = SHIP_BY_ID[ship].map[y]?.[x];
  return !ch || ch === '.' ? -1 : parseInt(ch, 36);
}

/** Hull cells a section of a ship plates. */
export function cellsInSection(ship: ShipId, index: number): number {
  const mark = index.toString(36);
  return SHIP_BY_ID[ship].map
    .join('')
    .split('')
    .filter((c) => c === mark).length;
}

/** A cell's mount tags on a ship's hull. */
export function tagsAt(ship: ShipId, x: number, y: number): readonly CellTag[] {
  return sectionAt(ship, x, y) >= 0 && SHIP_BY_ID[ship].keel.includes(x) ? ['keel'] : [];
}

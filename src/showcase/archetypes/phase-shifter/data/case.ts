// ─── Skeleton ───
// Night Clerk's content: the doors, the lifespan of every mechanism between
// them, the suspects and the copy. Pure data; door thresholds come from the
// spine and are passed in.

import type { Gate } from '@open-loop/engine';

/** Ids of the resources, categories and entities gates read by name. */
export const IDS = {
  pagesRead: 'pagesRead',
  leads: 'leads',
  doors: 'doors',
  eliminations: 'eliminations',
  eliminate: 'eliminate',
} as const;

/**
 * A door is the progress that moves the game from one phase to the next. Each
 * is opened once, by hand, when its record is met; nothing ever closes it.
 */
export type DoorId = 'pin-board' | 'reconstruct' | 'accuse';

export interface DoorDef {
  id: DoorId;
  title: string;
  description: string;
  /** The record that must hold before the door can be opened. */
  opensWhen: Gate;
  /** Case-log lines written the moment it opens. */
  log: string[];
}

/** The doors in order; thresholds are the spine's. */
export function doorDefs(thresholds: {
  boxPages: number;
  reconstructLeads: number;
  eliminable: number;
}): DoorDef[] {
  return [
    {
      id: 'pin-board',
      title: 'Pin it to the wall',
      description: 'Clear the desk. The box goes back on the shelf and does not come down again.',
      opensWhen: { kind: 'cumulative-gte', resource: IDS.pagesRead, value: thresholds.boxPages },
      log: [
        'You clear the desk. The box goes back on the shelf.',
        'The reading lamp is switched off. Your clerks stop reading and start cross-referencing.',
        'Somewhere above you, a telephone begins to ring.',
      ],
    },
    {
      id: 'reconstruct',
      title: 'Reconstruct the night',
      description: 'Take the board down. Every thread becomes a street, a lamp, a door left open.',
      opensWhen: {
        kind: 'cumulative-gte',
        resource: IDS.leads,
        value: thresholds.reconstructLeads,
      },
      log: [
        'The board comes down. Every thread you pinned becomes part of Harrow Mill, January 14, 1979.',
        'The canvassers are called in. The phone stops ringing.',
        'Your clerks take a new job: filing the accounts the model turns up.',
      ],
    },
    {
      id: 'accuse',
      title: 'Read the last account',
      description: 'Six alibis hold. One account was never filed.',
      opensWhen: {
        kind: 'count-gte',
        category: IDS.eliminations,
        entry: IDS.eliminate,
        value: thresholds.eliminable,
      },
      log: [],
    },
  ];
}

/**
 * Every mechanism the player meets. A mechanism is live from the door that
 * installs it until the door that retires it: `null` install means from the
 * first screen, `null` retire means until the case closes. `replaces` names
 * the mechanism whose role this one takes over — the same clerks, a new act.
 */
export type MechanismId =
  | 'read'
  | 'clerk-hire'
  | 'clerk-read'
  | 'xref'
  | 'clerk-xref'
  | 'tipline'
  | 'canvass'
  | 'second-shift'
  | 'night'
  | 'witness'
  | 'clerk-file'
  | 'eliminate'
  | 'insomnia';

export interface MechanismDef {
  id: MechanismId;
  installedBy: DoorId | null;
  retiredBy: DoorId | null;
  replaces?: MechanismId;
  /** How the "Filed away" list names it once retired; unlisted mechanisms retire silently. */
  label?: string;
}

export const MECHANISMS: MechanismDef[] = [
  { id: 'read', installedBy: null, retiredBy: 'pin-board', label: 'Reading the box' },
  { id: 'clerk-hire', installedBy: null, retiredBy: 'pin-board', label: 'Hiring clerks' },
  { id: 'clerk-read', installedBy: null, retiredBy: 'pin-board', label: 'Clerks reading' },
  {
    id: 'xref',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    label: 'Cross-referencing by hand',
  },
  {
    id: 'clerk-xref',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    replaces: 'clerk-read',
    label: 'Clerks cross-referencing',
  },
  { id: 'tipline', installedBy: 'pin-board', retiredBy: 'reconstruct', label: 'The tip line' },
  {
    id: 'canvass',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    label: 'Canvassing Harrow Mill',
  },
  {
    id: 'second-shift',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    label: 'The second shift',
  },
  { id: 'night', installedBy: 'reconstruct', retiredBy: 'accuse' },
  { id: 'witness', installedBy: 'reconstruct', retiredBy: 'accuse' },
  { id: 'clerk-file', installedBy: 'reconstruct', retiredBy: 'accuse', replaces: 'clerk-xref' },
  { id: 'eliminate', installedBy: 'reconstruct', retiredBy: 'accuse' },
  { id: 'insomnia', installedBy: 'reconstruct', retiredBy: null },
];

/** Phase headings, indexed by doors opened. */
export const PHASES = ['I. The Box', 'II. The Board', 'III. The Night', 'Closed'] as const;

export interface Suspect {
  name: string;
  role: string;
  /** The alibi that clears them, written when they are cleared. */
  alibi: string;
}

/** The first six can be cleared in order; the seventh is who is left. */
export const SUSPECTS: Suspect[] = [
  {
    name: 'Leon Varga',
    role: 'the boarder',
    alibi: 'Leon Varga was on the 9:40 bus to Corlis. The driver punched his ticket twice.',
  },
  {
    name: 'Rev. Thomas Ames',
    role: 'the minister',
    alibi:
      "Rev. Ames rang the 11 o'clock bell. Forty people heard it; three saw him pull the rope.",
  },
  {
    name: 'Dorothy Kell',
    role: 'the postmistress',
    alibi: 'Dorothy Kell sorted mail until two. The franking machine logs every stamp.',
  },
  {
    name: 'Walt Ferro',
    role: 'the mill foreman',
    alibi: 'Walt Ferro signed the night-shift register at 10:02 and again at 5:58.',
  },
  {
    name: 'June Ashby',
    role: "Ada's sister",
    alibi: 'June Ashby was in the county hospital with a broken wrist. The X-ray is dated.',
  },
  {
    name: 'Sheriff Dale Pruitt',
    role: 'the sheriff',
    alibi:
      'Sheriff Pruitt spent the night pulling a truck out of the Harrow ditch, on the radio log.',
  },
  {
    name: 'The night clerk',
    role: 'County Records, Sub-basement B',
    alibi: '',
  },
];

export const OPENING = [
  'A box came down the chute at 2:14 a.m.',
  'No label. No case number. No intake sheet.',
  'Inside: statements, carbons, a photograph of a schoolteacher named Ada Larkspur.',
];

/** Fragments the box gives up as it is read, keyed by pages read. */
export const BOX_FRAGMENTS: [number, string][] = [
  [1, '"Ada posted a letter at 4:50. She never posts letters." — D. Kell, postmistress'],
  [
    40,
    "Harrow Mill, January 14, 1979. Snow from six o'clock. Ada Larkspur was not seen after ten.",
  ],
  [150, "A carbon of a missing-persons report. The reporting officer's name has been cut out."],
  [500, 'The same name appears in three statements, in three different hands: "the clerk".'],
  [1200, 'A county records stamp, Sub-basement B. Your desk. Your stamp.'],
  [2500, 'A ledger page: who signed out the Larkspur file, and when. The last line is torn away.'],
];

/** The ending, read once the last account is opened. */
export const ENDING = [
  'Six alibis hold.',
  'One account in the model was never filed: the clerk on duty, County Records, the night of January 14, 1979.',
  'You pull the intake sheet from the bottom of the box. It was there all along.',
  'The handwriting is yours.',
];

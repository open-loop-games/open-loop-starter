// ─── Skeleton ───
// Night Clerk's content: the doors, the lifespan of every mechanism between
// them, the suspects and the copy. Pure data; door thresholds come from the
// spine and are passed in.

import type { Gate } from '@open-loop/engine';
import type { PersonId } from './evidence';

/** Ids of the resources, categories and entries gates read by name. */
export const IDS = {
  pagesRead: 'pagesRead',
  leads: 'leads',
  alibis: 'alibis',
  doors: 'doors',
} as const;

/**
 * A door is the progress that moves the game from one phase to the next. Each
 * is opened once, by hand, when its record holds and the door before it is
 * open; nothing ever closes it.
 */
export type DoorId = 'pin-board' | 'reconstruct' | 'box-returns';

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
  alibis: number;
}): DoorDef[] {
  return [
    {
      id: 'pin-board',
      title: 'Pin it to the wall',
      description: 'Clear the desk. The box goes back on the shelf and does not come down again.',
      opensWhen: { kind: 'cumulative-gte', resource: IDS.pagesRead, value: thresholds.boxPages },
      log: [
        'You clear the desk. The box goes back on the shelf.',
        'The reading lamp is switched off. Your clerks stop reading and start writing up cards.',
        'Somewhere above you, a telephone begins to ring.',
      ],
    },
    {
      id: 'reconstruct',
      title: 'Reconstruct the night',
      description:
        'Take the board down. Every card you pinned becomes a place and an hour you can watch.',
      opensWhen: {
        kind: 'cumulative-gte',
        resource: IDS.leads,
        value: thresholds.reconstructLeads,
      },
      log: [
        'The board comes down. Every card you pinned becomes part of Harrow Mill, January 14, 1979.',
        'The phone stops ringing. Your clerks take the night shift: they watch where you send them.',
      ],
    },
    {
      id: 'box-returns',
      title: 'The chute rattles',
      description: 'Six alibis hold. Something is coming back down.',
      opensWhen: { kind: 'cumulative-gte', resource: IDS.alibis, value: thresholds.alibis },
      log: [
        'The night model goes quiet. Your clerks go home.',
        'At 2:14 a.m. the box comes back down the chute. One page is left in it.',
      ],
    },
  ];
}

/**
 * Every mechanism the player meets. A mechanism is live from the door that
 * installs it until the door that retires it: `null` install means from the
 * first screen, `null` retire means until the case closes. `replaces` names
 * the mechanism whose role this one takes over at the same door — the same
 * clerks, a new act.
 */
export type MechanismId =
  | 'read'
  | 'clerk-hire'
  | 'clerk-read'
  | 'tipline'
  | 'clerk-write'
  | 'pin'
  | 'board-space'
  | 'strings'
  | 'night'
  | 'watch'
  | 'roster'
  | 'clerk-plan'
  | 'insomnia'
  | 'last-page';

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
  { id: 'tipline', installedBy: 'pin-board', retiredBy: 'reconstruct', label: 'The tip line' },
  {
    id: 'clerk-write',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    replaces: 'clerk-read',
    label: 'Clerks writing up cards',
  },
  { id: 'pin', installedBy: 'pin-board', retiredBy: 'reconstruct', label: 'Pinning the board' },
  {
    id: 'board-space',
    installedBy: 'pin-board',
    retiredBy: 'reconstruct',
    label: 'Clearing wall space',
  },
  { id: 'strings', installedBy: 'pin-board', retiredBy: 'reconstruct', label: 'The red string' },
  {
    id: 'night',
    installedBy: 'reconstruct',
    retiredBy: 'box-returns',
    label: 'The night replayed',
  },
  { id: 'watch', installedBy: 'reconstruct', retiredBy: 'box-returns', label: 'The stakeout' },
  { id: 'roster', installedBy: 'reconstruct', retiredBy: 'box-returns', label: 'The night roster' },
  {
    id: 'clerk-plan',
    installedBy: 'reconstruct',
    retiredBy: 'box-returns',
    replaces: 'clerk-write',
    label: 'Clerks planning the watch',
  },
  { id: 'insomnia', installedBy: 'reconstruct', retiredBy: null },
  { id: 'last-page', installedBy: 'box-returns', retiredBy: null },
];

/** Phase headings, indexed by doors opened. */
export const PHASES = [
  'I. The Box',
  'II. The Board',
  'III. The Night',
  'IV. The Last Page',
] as const;

export interface Suspect {
  id: PersonId;
  name: string;
  role: string;
  /** What they say they did; it holds once the stakeout has seen every hour of it. */
  alibi: string;
}

export const SUSPECTS: Suspect[] = [
  {
    id: 'varga',
    name: 'Leon Varga',
    role: 'the boarder',
    alibi: 'Leon Varga was on the 9:40 bus to Corlis. The driver punched his ticket twice.',
  },
  {
    id: 'ames',
    name: 'Rev. Thomas Ames',
    role: 'the minister',
    alibi:
      "Rev. Ames rang the 11 o'clock bell. Forty people heard it; three saw him pull the rope.",
  },
  {
    id: 'kell',
    name: 'Dorothy Kell',
    role: 'the postmistress',
    alibi: 'Dorothy Kell sorted mail until two. The franking machine logs every stamp.',
  },
  {
    id: 'ferro',
    name: 'Walt Ferro',
    role: 'the mill foreman',
    alibi: 'Walt Ferro signed the night-shift register at 10:02 and again at 5:58.',
  },
  {
    id: 'ashby',
    name: 'June Ashby',
    role: "Ada's sister",
    alibi: 'June Ashby was in the county hospital with a broken wrist. The X-ray is dated.',
  },
  {
    id: 'pruitt',
    name: 'Sheriff Dale Pruitt',
    role: 'the sheriff',
    alibi:
      'Sheriff Pruitt spent the night pulling a truck out of the Harrow ditch, on the radio log.',
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

/** The ending, read from the last page. */
export const ENDING = [
  'Six alibis hold.',
  'One account in the model was never filed: the clerk on duty, County Records, the night of January 14, 1979.',
  'The last page is the intake sheet. It was there all along.',
  'The handwriting is yours.',
];

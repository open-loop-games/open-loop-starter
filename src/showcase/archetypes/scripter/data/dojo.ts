import type { ChallengerId } from './challengers';

// ─── Skeleton ───
// The dojo's content: the techniques (each teaches words of the kata language), the old
// master's Insight scrolls, the student's executor tiers and the first scroll.

export type TechniqueId =
  | 'reading'
  | 'iron-body'
  | 'repetition'
  | 'breath-reading'
  | 'turning-hand'
  | 'patience'
  | 'high-and-low'
  | 'mirror'
  | 'many-hands'
  | 'names'
  | 'lineage'
  | 'thousand-hands';

export interface TechniqueDef {
  id: TechniqueId;
  displayName: string;
  /** The words it teaches, as the shelf shows them. */
  words: string;
  lore: string;
  /** Techniques that must be known first: the prerequisite graph. */
  after: TechniqueId[];
  /** The challenger whose arrival puts it on the shelf; null when the dojo's growth does. */
  answers: ChallengerId | null;
  /** A line the shelf offers to ink once it is learned. */
  example: string;
}

export const TECHNIQUES: readonly TechniqueDef[] = [
  {
    id: 'reading',
    displayName: 'Reading the Moment',
    words: 'if … : · ready · ki · students',
    lore: 'Pass over a move whose moment has not come, at no cost of breath.',
    after: [],
    answers: null,
    example: 'if ready recruit: recruit',
  },
  {
    id: 'iron-body',
    displayName: 'Iron Body',
    words: 'temper',
    lore: 'Harden the fist: every blow lands harder, and every training strike banks a second more of the dojo’s breath.',
    after: [],
    answers: 'ren',
    example: 'if ready temper: temper',
  },
  {
    id: 'repetition',
    displayName: 'Repetition',
    words: '3x',
    lore: 'One line, many beats, without a pause between.',
    after: [],
    answers: 'bao',
    example: '3x strike',
  },
  {
    id: 'breath-reading',
    displayName: 'Reading the Breath',
    words: 'chi',
    lore: 'Know how much breath is left before the fist does.',
    after: ['reading'],
    answers: 'wen',
    example: 'if chi < 20: breathe',
  },
  {
    id: 'turning-hand',
    displayName: 'The Turning Hand',
    words: 'parry · foe winds',
    lore: 'See the wind-up, and be somewhere else when it lands.',
    after: ['reading'],
    answers: 'gang',
    example: 'if foe winds: parry',
  },
  {
    id: 'patience',
    displayName: 'Patience',
    words: 'when … : · foe open',
    lore: 'Stand still until the moment comes.',
    after: ['reading'],
    answers: 'ma',
    example: 'when foe open: 3x strike',
  },
  {
    id: 'high-and-low',
    displayName: 'High and Low',
    words: 'kick · foe high · foe low',
    lore: 'A strike goes high and a kick goes low; go where the guard is not.',
    after: ['reading'],
    answers: 'twins',
    example: 'if foe high: kick',
  },
  {
    id: 'mirror',
    displayName: 'The Mirror’s Lesson',
    words: 'palm · alternate',
    lore: 'Never show the same hand twice running.',
    after: [],
    answers: 'lu',
    example: '3x alternate strike kick palm',
  },
  {
    id: 'many-hands',
    displayName: 'Many Hands',
    words: 'sweep · foes',
    lore: 'One wide blow for every attacker still standing.',
    after: ['reading'],
    answers: 'redgate',
    example: 'if foes > 1: sweep',
  },
  {
    id: 'names',
    displayName: 'The Envoy’s Names',
    words: 'foe is … · blocks · else',
    lore: 'Know who stands at the gate, and keep a form for each.',
    after: ['reading'],
    answers: 'envoy',
    example: 'if foe is ma:\n  when foe open: 3x strike\nelse:\n  3x alternate strike kick palm',
  },
  {
    id: 'lineage',
    displayName: 'Lineage',
    words: 'promote · senpai',
    lore: 'Raise a senior who trains the juniors.',
    after: ['reading', 'iron-body'],
    answers: null,
    example: 'if ready promote: promote',
  },
  {
    id: 'thousand-hands',
    displayName: 'Thousand Hands',
    words: '… max',
    lore: 'Hire every student the purse allows in one breath.',
    after: ['lineage'],
    answers: null,
    example: 'if ready recruit: recruit max',
  },
];

/**
 * The technique that teaches each word past the starting three (`strike`, `breathe`,
 * `recruit`). `repeat` stands for an `Nx` prefix and `block` for a test that opens a block.
 */
export const WORD_TECHNIQUE: Readonly<Record<string, TechniqueId>> = {
  if: 'reading',
  ready: 'reading',
  ki: 'reading',
  students: 'reading',
  temper: 'iron-body',
  repeat: 'repetition',
  chi: 'breath-reading',
  parry: 'turning-hand',
  winds: 'turning-hand',
  when: 'patience',
  open: 'patience',
  kick: 'high-and-low',
  high: 'high-and-low',
  low: 'high-and-low',
  palm: 'mirror',
  alternate: 'mirror',
  sweep: 'many-hands',
  foes: 'many-hands',
  is: 'names',
  block: 'names',
  else: 'names',
  promote: 'lineage',
  senpai: 'lineage',
  max: 'thousand-hands',
};

export type ScrollId =
  | 'ancestral-breath'
  | 'old-masters-ink'
  | 'remembered-forms'
  | 'founding-students';

export interface ScrollDef {
  id: ScrollId;
  displayName: string;
  lore: string;
}

/** The old master's scrolls, bought with Insight; they survive every graduation. */
export const SCROLLS: readonly ScrollDef[] = [
  { id: 'ancestral-breath', displayName: 'Ancestral Breath', lore: '×1.5 Ki, per level.' },
  {
    id: 'old-masters-ink',
    displayName: 'Old Master’s Ink',
    lore: '+2 moves on every scroll, per level.',
  },
  {
    id: 'remembered-forms',
    displayName: 'Remembered Forms',
    lore: 'Techniques stay learned through graduation.',
  },
  {
    id: 'founding-students',
    displayName: 'Founding Students',
    lore: 'Each new student’s dojo opens with 5 more students, per level.',
  },
];

export type ScripterAutomationTier =
  | 'novice'
  | 'steady-breath'
  | 'flowing-form'
  | 'empty-mind'
  | 'no-mind';

export interface ExecutorTierDef {
  id: ScripterAutomationTier;
  displayName: string;
  /** What opens it, as the dojo panel says it. */
  hint: string;
}

/** The student's hand: each tier performs a beat a quarter faster and holds two more moves. */
export const EXECUTOR_TIERS: readonly ExecutorTierDef[] = [
  { id: 'novice', displayName: 'Novice Reader', hint: 'from the start' },
  { id: 'steady-breath', displayName: 'Steady Breath', hint: 'beats performed' },
  { id: 'flowing-form', displayName: 'Flowing Form', hint: 'Ki earned, all time' },
  { id: 'empty-mind', displayName: 'Empty Mind', hint: 'one graduation' },
  { id: 'no-mind', displayName: 'No-Mind', hint: 'three graduations' },
];

/** The scroll a fresh dojo starts with, and the one a student falls back to. */
export const FIRST_SCROLL =
  '# strike three times, then try to hire\nstrike\nstrike\nstrike\nrecruit';

/** Saved scroll templates on the rack. */
export const RACK_SLOTS = 4;

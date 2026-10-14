// ─── Skeleton ───
// The challengers at the gate, in the order they arrive. Each one's pattern beats the
// scroll the dojo has when it first comes; its arrival puts the technique that answers
// it on the shelf. Their rules are in `../modules/bout.ts`; their numbers in `./spine.ts`
// § Bouts.

/** How a challenger fights: the rule set `bout.ts` resolves its beats with. */
export type Pattern =
  | 'post'
  | 'hide'
  | 'wall'
  | 'crane'
  | 'hammer'
  | 'shell'
  | 'twins'
  | 'mirror'
  | 'gang'
  | 'gauntlet';

export type ChallengerId =
  | 'post'
  | 'ren'
  | 'bao'
  | 'wen'
  | 'gang'
  | 'ma'
  | 'twins'
  | 'lu'
  | 'redgate'
  | 'envoy';

export interface ChallengerDef {
  id: ChallengerId;
  /** What `foe is` names: one lowercase word. */
  name: string;
  displayName: string;
  pattern: Pattern;
  /** Health, in plain blows of the student's fist. */
  blows: number;
  /** What the gate card says the challenger does: the tell the scroll must read. */
  tell: string;
  /** The technique whose words answer this challenger; null for the first. */
  answer: string | null;
}

export const CHALLENGERS: readonly ChallengerDef[] = [
  {
    id: 'post',
    name: 'post',
    displayName: 'The Straw Post',
    pattern: 'post',
    blows: 8,
    answer: null,
    tell: 'Never strikes back.',
  },
  {
    id: 'ren',
    name: 'ren',
    displayName: 'Ox-Hide Ren',
    pattern: 'hide',
    blows: 10,
    answer: 'iron-body',
    tell: 'His hide turns aside two points of every blow.',
  },
  {
    id: 'bao',
    name: 'bao',
    displayName: 'Old Bao, the Wall',
    pattern: 'wall',
    blows: 14,
    answer: 'repetition',
    tell: 'Reads every new movement: the first blow of a line glances off. Only a flurry lands.',
  },
  {
    id: 'wen',
    name: 'wen',
    displayName: 'Sister Wen, the Patient Crane',
    pattern: 'crane',
    blows: 34,
    answer: 'breath-reading',
    tell: 'Saps chi on every beat of her own, and mends while the student is not striking.',
  },
  {
    id: 'gang',
    name: 'gang',
    displayName: 'Brother Gang, the Hammerfist',
    pattern: 'hammer',
    blows: 30,
    answer: 'turning-hand',
    tell: 'Winds up for three beats, then smashes. A parry raised in time turns it aside and leaves him open.',
  },
  {
    id: 'ma',
    name: 'ma',
    displayName: 'Iron-Shell Ma',
    pattern: 'shell',
    blows: 30,
    answer: 'patience',
    tell: 'Shelled: a blow does nothing and jars the hands for two beats. After each jab of their own, open for three.',
  },
  {
    id: 'twins',
    name: 'twins',
    displayName: 'The Twins of Low and High',
    pattern: 'twins',
    blows: 30,
    answer: 'high-and-low',
    tell: 'Guard high or guard low, swapping every few beats. A strike goes high, a kick goes low.',
  },
  {
    id: 'lu',
    name: 'lu',
    displayName: 'Master Lu, the Mirror',
    pattern: 'mirror',
    blows: 30,
    answer: 'mirror',
    tell: 'Turns aside any form the student used on either of the last two blows, and answers it.',
  },
  {
    id: 'redgate',
    name: 'redgate',
    displayName: 'The Red Gate Gang',
    pattern: 'gang',
    blows: 12,
    answer: 'many-hands',
    tell: 'Three at once, each striking on their own beat. A sweep catches every one still standing.',
  },
  {
    id: 'envoy',
    name: 'envoy',
    displayName: "The Envoy's Gauntlet",
    pattern: 'gauntlet',
    blows: 0,
    answer: 'names',
    tell: 'Four who have stood at this gate, back to back, at half strength, in an order no one is told.',
  },
];

export function challenger(id: ChallengerId): ChallengerDef {
  return CHALLENGERS.find((c) => c.id === id)!;
}

/** The challengers the Envoy's Gauntlet draws from: every patterned one before it. */
export const GAUNTLET_POOL: readonly ChallengerId[] = [
  'bao',
  'wen',
  'gang',
  'ma',
  'twins',
  'lu',
  'redgate',
];

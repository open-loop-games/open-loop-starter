// ─── Skeleton ───
// The march: fifteen fields, three a lord: two outlying holdings, then the lord's keep. A
// field is a battle row, as a mission is in Warfare 1917: which troops either keep may
// raise there, what lies across the causeway, how the lord's purse opens, and on a keep field
// the champion who rides out at a set time. Troops open by field on both sides, so a new
// Fairhold meets the wheel one leg at a time.

import type { TroopId } from './troops';

export type FeatureKind = 'ford' | 'stakes';

/** A band of the causeway, in paces from Fairhold's gate. Laid symmetric about the middle. */
export interface Feature {
  kind: FeatureKind;
  from: number;
  to: number;
}

export interface ChampionDef {
  name: string;
  /** The troop it fights as: its place on the wheel. */
  troop: TroopId;
  /** Battle second it rides out of the lord's gate. */
  at: number;
}

export interface FieldDef {
  /** Index into the ladder of lords. */
  lord: number;
  name: string;
  /** One line in Fairhold's voice, shown in camp. */
  tell: string;
  /** Troops either keep may raise on this field. */
  open: TroopId[];
  features: Feature[];
  /** The lord's opening purse, in seconds of income, where it differs from Fairhold's. */
  rivalStartSeconds?: number;
  champions: ChampionDef[];
  /** No twist is drawn for this field. */
  calm?: boolean;
}

const ALL: TroopId[] = ['pike', 'horse', 'bow', 'siege'];
const ford = (from = 42, to = 58): Feature => ({ kind: 'ford', from, to });
const stakes = (from = 38, to = 62): Feature => ({ kind: 'stakes', from, to });

export const FIELDS: FieldDef[] = [
  {
    lord: 0,
    name: 'Grubb’s Ford',
    tell: 'Yeomen against yeomen, knee-deep. Mind the horn.',
    open: ['pike', 'siege'],
    features: [ford()],
    champions: [],
    calm: true,
  },
  {
    lord: 0,
    name: 'the Mire Mill',
    tell: 'The Mire has found some horses. Our yeomen know what to do with them.',
    open: ['pike', 'horse', 'siege'],
    features: [],
    champions: [],
    calm: true,
  },
  {
    lord: 0,
    name: 'the Mudhole',
    tell: 'Grubb’s own gate. Our bowmen are mustered at last.',
    open: ALL,
    features: [],
    champions: [{ name: 'Big Mott', troop: 'pike', at: 90 }],
  },
  {
    lord: 1,
    name: 'the Tithe Barn',
    tell: 'The Abbot keeps his silver here, and his monks at the ford.',
    open: ALL,
    features: [ford()],
    champions: [],
  },
  {
    lord: 1,
    name: 'Dunmarrow Grange',
    tell: 'Stakes in the road. No knight charges through a hedge of them.',
    open: ALL,
    features: [stakes()],
    champions: [],
  },
  {
    lord: 1,
    name: 'the Counting-House',
    tell: 'The Abbot opens his strongbox for this one.',
    open: ALL,
    features: [],
    rivalStartSeconds: 10,
    champions: [{ name: 'Brother Cuthbert', troop: 'pike', at: 90 }],
  },
  {
    lord: 2,
    name: 'Watch Hill',
    tell: 'Vesk can see our bailey from here. She will answer it.',
    open: ALL,
    features: [stakes()],
    champions: [],
  },
  {
    lord: 2,
    name: 'the Long Ford',
    tell: 'Water from one end of the road to the other.',
    open: ALL,
    features: [ford(30, 70)],
    champions: [],
  },
  {
    lord: 2,
    name: 'the Spyglass',
    tell: 'Her gate, and her knight-errant.',
    open: ALL,
    features: [],
    champions: [{ name: 'Sir Ottiline', troop: 'horse', at: 60 }],
  },
  {
    lord: 3,
    name: 'the Twin Fords',
    tell: 'Two fords, two brothers, one bad idea.',
    open: ALL,
    features: [ford(30, 40), ford(60, 70)],
    champions: [],
  },
  {
    lord: 3,
    name: 'the Sty Bridge',
    tell: 'They have staked the bridge. Badly.',
    open: ALL,
    features: [stakes(44, 56)],
    champions: [],
  },
  {
    lord: 3,
    name: 'the Twin Sties',
    tell: 'Both Harrows ride out, one after the other.',
    open: ALL,
    features: [],
    champions: [
      { name: 'Harrow the Elder', troop: 'pike', at: 90 },
      { name: 'Harrow the Younger', troop: 'horse', at: 150 },
    ],
  },
  {
    lord: 4,
    name: 'the King’s Road',
    tell: 'The old road to the capital. It is ours by right.',
    open: ALL,
    features: [],
    champions: [],
  },
  {
    lord: 4,
    name: 'Traitor’s Gate',
    tell: 'Stakes, a ford, and the pretender’s hirelings behind both.',
    open: ALL,
    features: [ford(30, 40), stakes(55, 70)],
    rivalStartSeconds: 10,
    champions: [],
  },
  {
    lord: 4,
    name: 'the Stolen Throne',
    tell: 'Take this gate and the Causeway is ours.',
    open: ALL,
    features: [],
    rivalStartSeconds: 15,
    champions: [
      { name: 'the Usurper’s Guard', troop: 'pike', at: 60 },
      { name: 'the Usurper', troop: 'horse', at: 180 },
    ],
  },
];

/** The field at a rung of the march; past the end, the heirs fight over the keep fields again. */
export function fieldAt(rung: number): FieldDef {
  if (rung < FIELDS.length) return FIELDS[rung]!;
  const keeps = FIELDS.filter((_, i) => i % 3 === 2);
  return { ...keeps[(rung - FIELDS.length) % keeps.length]!, lord: 4 };
}

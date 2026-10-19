/**
 * What a crew builds: the economy (hustlers, ley taps, turf), the training
 * floors that convert scrip and aether into units, squats that raise the
 * supply cap, and the research tree. Each kind of unit is opened by its tech
 * floor; every floor then trains whatever kinds stand open, by the seat's
 * queue. Prerequisites are Gates over the side's own category ids, so the
 * tree is data.
 */
import type { Gate } from '@open-loop/engine';
import type { UnitKind } from './units';
import {
  AETHER_PRICE,
  HUSTLER_RATE,
  START_HUSTLERS,
  TAP_LIMIT,
  TAP_RATE,
  SUPPLY_BASE,
  SUPPLY_PER_SQUAT,
  TRAIN_S,
  CHARTER_FLOORS,
  buildingBaseCost,
  charterCost,
  buildingRatio,
  hustlerBaseCost,
  hustlerRatio,
  squatBaseCost,
  squatRatio,
  tapBaseCost,
  tapRatio,
  turfRate,
  unitValue,
} from './spine';

export type SideId = 'p' | 'e';

/** Category ids for one side; Gates name them. */
export const catId = {
  econ: (s: SideId) => `${s}-econ`,
  barracks: (s: SideId) => `${s}-barracks`,
  research: (s: SideId) => `${s}-research`,
  crew: (s: SideId) => `${s}-crew`,
  tier: (s: SideId) => `${s}-tier`,
};

// ─── Skeleton ──────────────────────────────────────────────────────────────

export type EconId = 'hustler' | 'ley-tap' | 'turf';

export interface EconDef {
  id: EconId;
  name: string;
  blurb: string;
  output: 'scrip' | 'aether';
  rate: number;
  /** Absent for turf, whose count is the districts held. */
  purchase?: { baseCost: number; ratio: number; limit?: number; initial?: number };
}

/** A tech floor: it opens one kind of unit to every floor, and is a floor itself. */
export interface BarracksDef {
  id: string;
  name: string;
  blurb: string;
  /** The kind it opens. */
  trains: UnitKind;
  /** Present on the second tier, which waits for the charter too. */
  tier?: 2;
  /** Availability within its tier: a Gate over this side's categories. Built per side. */
  requires: (s: SideId) => Gate | undefined;
  requiresText: string;
}

export type ResearchEffect =
  | { kind: 'damage'; units: UnitKind[]; mult: number }
  | { kind: 'hp'; units: UnitKind[]; mult: number }
  | { kind: 'income'; mult: number }
  | { kind: 'training'; mult: number }
  | { kind: 'turret'; mult: number };

export interface ResearchDef {
  id: string;
  name: string;
  blurb: string;
  cost: { scrip: number; aether: number };
  effect: ResearchEffect;
  /** Present on the second tier, which waits for the charter too. */
  tier?: 2;
  requires: (s: SideId) => Gate | undefined;
  requiresText: string;
}

/** The tier-up: a one-shot purchase that opens the second tier of floors and research. */
export interface CharterDef {
  id: 'charter';
  name: string;
  blurb: string;
  /** Scrip. */
  cost: number;
  /** Floors, tech or plain, that must stand before it can be bought. */
  floors: number;
}

const owns = (category: string, entry: string): Gate => ({
  kind: 'count-gte',
  category,
  entry,
  value: 1,
});
const researched = (s: SideId, entry: string): Gate => ({
  kind: 'active',
  category: catId.research(s),
  entry,
});
const chartered = (s: SideId): Gate => ({
  kind: 'active',
  category: catId.tier(s),
  entry: 'charter',
});

/** What a floor or research line waits on: its own prerequisite, and the charter if it is tier two. */
export function prerequisiteOf(
  def: { tier?: 2; requires: (s: SideId) => Gate | undefined },
  s: SideId,
): Gate | undefined {
  const own = def.requires(s);
  if (def.tier !== 2) return own;
  return own ? { kind: 'all', of: [chartered(s), own] } : chartered(s);
}

/** The same prerequisite in player text, after "needs"; a chartered crew no longer needs the charter. */
export function prerequisiteText(
  def: { tier?: 2; requiresText: string },
  chartered: boolean,
): string {
  if (def.tier !== 2 || chartered) return def.requiresText;
  return def.requiresText ? `the charter and ${def.requiresText}` : 'the charter';
}

// ─── Balance ───────────────────────────────────────────────────────────────

export const ECON: EconDef[] = [
  {
    id: 'hustler',
    name: 'Hustlers',
    blurb: 'Fences, runners and street-corner fixers. Every one brings scrip home.',
    output: 'scrip',
    rate: HUSTLER_RATE,
    purchase: { baseCost: hustlerBaseCost, ratio: hustlerRatio, initial: START_HUSTLERS },
  },
  {
    id: 'ley-tap',
    name: 'Ley taps',
    blurb: 'Copper spikes driven into the old ley lines under the sprawl. Aether seeps up.',
    output: 'aether',
    rate: TAP_RATE,
    purchase: { baseCost: tapBaseCost, ratio: tapRatio, limit: TAP_LIMIT },
  },
  {
    id: 'turf',
    name: 'Turf',
    blurb: 'Protection money from every district your crew holds.',
    output: 'scrip',
    rate: turfRate,
  },
];

/** Every floor, tech or plain, is priced on one ladder by the floors already standing. */
export const FLOORS = {
  name: 'Training floors',
  blurb: 'Bunk rooms and back rooms turned over to training whatever the crew needs.',
  baseCost: buildingBaseCost,
  ratio: buildingRatio,
};

export const BARRACKS: BarracksDef[] = [
  {
    id: 'chop-shop',
    name: 'Chop shop',
    blurb: 'Back-alley chrome installs, no questions.',
    trains: 'razor',
    requires: () => undefined,
    requiresText: '',
  },
  {
    id: 'talisman-parlor',
    name: 'Talisman parlor',
    blurb: 'Incense, debt ledgers and a back room where the chalk circles are.',
    trains: 'hexer',
    requires: (s) => owns(catId.econ(s), 'ley-tap'),
    requiresText: 'a ley tap',
  },
  {
    id: 'drone-garage',
    name: 'Drone garage',
    blurb: 'Rotor drones on hooks and riggers asleep in the jack chairs.',
    trains: 'rigger',
    requires: (s) => owns(catId.barracks(s), 'chop-shop'),
    requiresText: 'a chop shop',
  },
  {
    id: 'black-clinic',
    name: 'Black clinic',
    blurb: 'Stolen corp exo-frames refitted for whoever pays.',
    trains: 'enforcer',
    tier: 2,
    requires: () => undefined,
    requiresText: '',
  },
];

/** One charter raises a crew a tier: it opens the black clinic and the tier-two research. */
export const CHARTER: CharterDef = {
  id: 'charter',
  name: 'Syndicate charter',
  blurb:
    'The Lantern Syndicate puts your crew on its books. Exo-frame brokers and the better labs start taking your calls.',
  cost: charterCost,
  floors: CHARTER_FLOORS,
};

/** Squats: each one houses SUPPLY_PER_SQUAT more units over the SUPPLY_BASE a safehouse holds. */
export const SQUATS = {
  name: 'Coffin squats',
  blurb: 'Stacked sleep-pods in a condemned arcology. More bunks, bigger crew.',
  baseCost: squatBaseCost,
  ratio: squatRatio,
  supplyBase: SUPPLY_BASE,
  supplyPer: SUPPLY_PER_SQUAT,
};

/** Units of value per second one training floor makes. */
export const TRAIN_RATE = 1 / TRAIN_S;

// Research prices are in units of value: a tier-1 line costs three units, a
// tier-2 line five. Aether lines pay a third in aether at AETHER_PRICE.
const tier = (units: number, aetherShare: number) => ({
  scrip: Math.round(units * unitValue * (1 - aetherShare)),
  aether: Math.round((units * unitValue * aetherShare) / AETHER_PRICE),
});

export const RESEARCH: ResearchDef[] = [
  {
    id: 'syndicate-ledgers',
    name: 'Syndicate ledgers',
    blurb: 'Double books, triple cuts. Hustlers bring home a fifth more.',
    cost: tier(3, 0),
    effect: { kind: 'income', mult: 1.2 },
    requires: () => undefined,
    requiresText: '',
  },
  {
    id: 'smartlink-rounds',
    name: 'Smartlink rounds',
    blurb: 'Guided caseless ammunition. Razorboys and enforcers hit 30% harder.',
    cost: tier(3, 0),
    effect: { kind: 'damage', units: ['razor', 'enforcer'], mult: 1.3 },
    requires: (s) => owns(catId.barracks(s), 'chop-shop'),
    requiresText: 'a chop shop',
  },
  {
    id: 'spirit-pacts',
    name: 'Spirit pacts',
    blurb: 'Bargains with things in the ley static. Hexers hit 30% harder.',
    cost: tier(3, 1 / 3),
    effect: { kind: 'damage', units: ['hexer'], mult: 1.3 },
    requires: (s) => owns(catId.barracks(s), 'talisman-parlor'),
    requiresText: 'a talisman parlor',
  },
  {
    id: 'ice-breakers',
    name: 'ICE breakers',
    blurb: 'Military intrusion suites. Riggers hit 30% harder.',
    cost: tier(3, 1 / 3),
    effect: { kind: 'damage', units: ['rigger'], mult: 1.3 },
    requires: (s) => owns(catId.barracks(s), 'drone-garage'),
    requiresText: 'a drone garage',
  },
  {
    id: 'dermal-weave',
    name: 'Dermal weave',
    blurb: 'Subdermal mesh for everyone on the payroll. Every unit takes 25% more to drop.',
    cost: tier(5, 1 / 3),
    effect: { kind: 'hp', units: ['razor', 'hexer', 'rigger', 'enforcer'], mult: 1.25 },
    tier: 2,
    requires: (s) => researched(s, 'smartlink-rounds'),
    requiresText: 'Smartlink rounds',
  },
  {
    id: 'ward-glyphs',
    name: 'Ward glyphs',
    blurb: 'Glyphs burned into the safehouse doors. The turret hits twice as hard.',
    cost: tier(5, 1 / 3),
    effect: { kind: 'turret', mult: 2 },
    tier: 2,
    requires: (s) => researched(s, 'spirit-pacts'),
    requiresText: 'Spirit pacts',
  },
  {
    id: 'overclocked-fabs',
    name: 'Overclocked fabs',
    blurb: 'Every training floor runs a third faster.',
    cost: tier(5, 1 / 3),
    effect: { kind: 'training', mult: 1.33 },
    tier: 2,
    requires: (s) => ({
      kind: 'all',
      of: [researched(s, 'ice-breakers'), researched(s, 'syndicate-ledgers')],
    }),
    requiresText: 'ICE breakers and Syndicate ledgers',
  },
];

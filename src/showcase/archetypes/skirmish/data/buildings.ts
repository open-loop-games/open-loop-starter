/**
 * What a crew builds: the economy (hustlers and ley taps), the training
 * floors that convert scrip and aether into units, squats that raise the
 * supply cap, and the research tree. Each kind of unit is opened by its tech
 * floor; every floor then trains whatever kinds stand open, by the seat's
 * queue. Prerequisites are Gates over the side's own category ids, so the
 * tree is data.
 */
import type { Gate } from '@open-loop/engine';
import type { UnitKind } from './units';
import { DISTRICTS } from './contracts';
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
  NODE_HUSTLERS,
  DISTRICT_TURRET_VALUE,
  TURRET_LEVELS,
  districtTurretCost,
  districtTurretDps,
  districtTurretHp,
  turretLevelCost,
  hustlerBaseCost,
  hustlerRatio,
  squatBaseCost,
  squatRatio,
  tapBaseCost,
  tapRatio,
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

/** The safehouse's hustlers, a district's, or the ley taps. */
export type EconId = 'hustler' | `hustler-${string}` | 'ley-tap';

export interface EconDef {
  id: EconId;
  name: string;
  blurb: string;
  output: 'scrip' | 'aether';
  rate: number;
  purchase: { baseCost: number; ratio: number; limit: number; initial?: number };
  /** A district's hustlers: hired while the seat owns it, laid off when the rival takes it. */
  district?: number;
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

// Every node climbs its own ladder from `hustlerBaseCost`. The safehouse's starts past the
// hustlers it opens with, so its base is divided back down by them.
export const ECON: EconDef[] = [
  {
    id: 'hustler',
    name: 'Hustlers',
    blurb: 'Fences, runners and street-corner fixers working out of the safehouse.',
    output: 'scrip',
    rate: HUSTLER_RATE,
    purchase: {
      baseCost: hustlerBaseCost / hustlerRatio ** START_HUSTLERS,
      ratio: hustlerRatio,
      limit: START_HUSTLERS + NODE_HUSTLERS,
      initial: START_HUSTLERS,
    },
  },
  ...DISTRICTS.map((d, i): EconDef => ({
    id: `hustler-${d.id}`,
    name: `${d.name} rackets`,
    blurb: `Hustlers working ${d.name}. They run while your crew owns it, and scatter when the rival takes it.`,
    output: 'scrip',
    rate: HUSTLER_RATE,
    purchase: { baseCost: hustlerBaseCost, ratio: hustlerRatio, limit: NODE_HUSTLERS },
    district: i,
  })),
  {
    id: 'ley-tap',
    name: 'Ley taps',
    blurb: 'Copper spikes driven into the old ley lines under the sprawl. Aether seeps up.',
    output: 'aether',
    rate: TAP_RATE,
    purchase: { baseCost: tapBaseCost, ratio: tapRatio, limit: TAP_LIMIT },
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

/** Safehouse turret levels: each adds the first turret's fire; the safehouse opens with one. */
export const GATE_GUNS = {
  name: 'Gate guns',
  blurb: 'Another turret on the safehouse roof. A siege needs more bodies to get through.',
  levels: TURRET_LEVELS,
  /** Scrip for the level the next purchase raises the safehouse to. */
  cost: turretLevelCost,
};

/** A district turret: it fights for the district its seat owns and holds it while it stands. */
export const SENTRY_NEST = {
  name: 'Sentry nest',
  blurb: 'A rooftop gun nest over your rackets. Nobody takes the district while it stands.',
  dps: districtTurretDps,
  hp: districtTurretHp,
  cost: districtTurretCost,
  /** Fire spread over a district counts the nest as this many units. */
  bulk: DISTRICT_TURRET_VALUE,
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

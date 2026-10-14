// ─── Skeleton ───
// Paragon's content: what exists and what it is called. Every number is read
// from the spine (`./spine.ts`), so this file holds fiction and shape only.

import {
  ANCHORS,
  CANON_PRICES,
  CONTINUITY_PRICES,
  EARTHS,
  ELSEWORLD_GOALS,
  ELSEWORLD_LEVERS,
  HIGH_TIER_FROM,
  IMPRINTS,
  LEGACY_PRICES,
  LEVERS,
  NETWORK,
  tierCost,
  tierRate,
  type ChainSpec,
  type ElseworldId,
} from './spine';

// ── The corps — producer tiers ──

const TIER_FICTION = [
  ['patrol', 'Night Patrol', 'Masked locals walking the beat.'],
  ['response', 'Rapid Response', 'Capes on call, three minutes out.'],
  ['strike', 'Strike Squad', 'Coordinated takedowns of street syndicates.'],
  ['tower', 'Signal Tower', 'A beacon over the skyline; villains think twice.'],
  ['league', 'Hero League', 'A roster of household names under one banner.'],
  ['bastion', 'Orbital Bastion', 'A fortress in orbit watching every block.'],
] as const;

export type TierId = (typeof TIER_FICTION)[number][0];

export interface TierDef {
  id: TierId;
  /** 1-based rung on the ladder. */
  tier: number;
  displayName: string;
  blurb: string;
  baseCost: number;
  baseRate: number;
}

export const TIERS: TierDef[] = TIER_FICTION.slice(0, ANCHORS.tierCount).map(
  ([id, displayName, blurb], i) => ({
    id,
    tier: i + 1,
    displayName,
    blurb,
    baseCost: tierCost(i + 1),
    baseRate: tierRate(i + 1),
  }),
);

export { HIGH_TIER_FROM };

// ── The chains — one per prestige layer ──

/** One tier of a cascading chain: tier 1 makes the currency, each tier above makes the one below. */
export interface ChainTierDef {
  id: string;
  /** 1-based rung on the chain. */
  tier: number;
  displayName: string;
  blurb: string;
  baseCost: number;
  costRatio: number;
  /** Tier 1: currency per unit per second; above: units of the tier below per unit per second. */
  rate: number;
}

function chainTiers(spec: ChainSpec, fiction: readonly (readonly [string, string, string])[]) {
  return fiction.map(([id, displayName, blurb], i): ChainTierDef => ({
    id,
    tier: i + 1,
    displayName,
    blurb,
    baseCost: spec.base[i],
    costRatio: spec.ratio[i],
    rate: spec.rate[i],
  }));
}

/** The Network, bought with Legacy; it makes Hope. */
export const NETWORK_TIERS = chainTiers(NETWORK, [
  ['informant', 'Informant', 'Ears on every corner. Each one keeps Hope alive.'],
  ['safehouse', 'Safehouse', 'A place to recruit from. Each one turns out Informants.'],
  ['watchtower', 'Watchtower', 'Sees the whole district. Each one sets up Safehouses.'],
]);

/** Parallel Earths, bought with Continuity; they make Echoes. */
export const EARTH_TIERS = chainTiers(EARTHS, [
  ['earth-two', 'Earth-Two', 'The world next door. Each one sends back Echoes.'],
  ['earth-three', 'Earth-Three', 'A mirror with the colours flipped. Each one opens an Earth-Two.'],
  [
    'earth-prime',
    'Earth-Prime',
    'The one where you are only a comic. Each one opens an Earth-Three.',
  ],
]);

/** Imprints, bought with Canon; they make Myth. */
export const IMPRINT_TIERS = chainTiers(IMPRINTS, [
  ['indie', 'Indie Imprint', 'Odd little books with loyal readers. Each one adds to the Myth.'],
  ['prestige', 'Prestige Imprint', 'Square-bound and serious. Each one launches an Indie Imprint.'],
  ['flagship', 'Flagship Line', 'The book everyone reads. Each one launches a Prestige Imprint.'],
]);

// ── Legacy — the first prestige layer's shop ──

export type LegacyUpgradeId = keyof typeof LEGACY_PRICES | 'training';

export interface LegacyUpgradeDef {
  id: LegacyUpgradeId;
  displayName: string;
  description: string;
  /** One-shot price; Hero Training is levelled and priced by the spine's levers. */
  price?: number;
}

export const LEGACY_UPGRADES: LegacyUpgradeDef[] = [
  {
    id: 'dispatch',
    displayName: 'Dispatch Desk',
    description: 'A dispatcher recruits heroes for you, cheapest payback first.',
    price: LEGACY_PRICES.dispatch,
  },
  {
    id: 'public-trust',
    displayName: 'Public Trust',
    description: `The city believes in you. All heroes ×${LEVERS.publicTrustMult}.`,
    price: LEGACY_PRICES['public-trust'],
  },
  {
    id: 'elseworld-protocols',
    displayName: 'Elseworld Protocols',
    description: 'Opens Elseworlds: runs under worse rules for permanent rewards.',
    price: LEGACY_PRICES['elseworld-protocols'],
  },
  {
    id: 'press-office',
    displayName: 'Press Office',
    description: `Every Reboot's Legacy ×${LEVERS.pressOfficeMult}.`,
    price: LEGACY_PRICES['press-office'],
  },
  {
    id: 'training',
    displayName: 'Hero Training',
    description: `All heroes ×${LEVERS.trainingMult} per level.`,
  },
];

// ── Continuity — the second prestige layer's shop ──

export type ContinuityUpgradeId = keyof typeof CONTINUITY_PRICES | 'mythic' | 'drill';

export interface ContinuityUpgradeDef {
  id: ContinuityUpgradeId;
  displayName: string;
  description: string;
  price?: number;
}

export const CONTINUITY_UPGRADES: ContinuityUpgradeDef[] = [
  {
    id: 'succession',
    displayName: 'Succession Plan',
    description: `Reboots the timeline for you once pending Legacy reaches your set share of Legacy earned, at most once every ${LEVERS.successionIntervalS} seconds.`,
    price: CONTINUITY_PRICES.succession,
  },
  {
    id: 'eternal-dispatch',
    displayName: 'Eternal Dispatch',
    description: 'Dispatch Desk and Elseworld Protocols survive a Rewrite.',
    price: CONTINUITY_PRICES['eternal-dispatch'],
  },
  {
    id: 'liaison',
    displayName: 'Network Liaison',
    description:
      'Spends Legacy for you: the shop in price order, then the cheapest of Hero Training and the Network.',
    price: CONTINUITY_PRICES.liaison,
  },
  {
    id: 'archives',
    displayName: 'Elseworld Archives',
    description: 'Each Elseworld can be resolved four times, not two.',
    price: CONTINUITY_PRICES.archives,
  },
  {
    id: 'mythic',
    displayName: 'Mythic Standing',
    description: `Legacy from every Reboot ×${LEVERS.mythicMult} per level.`,
  },
  {
    id: 'drill',
    displayName: 'Succession Drills',
    description: `The Succession Plan's interval ×${LEVERS.drillCut} per level, down to ${LEVERS.drillFloorS} seconds.`,
  },
];

/** Continuity upgrades an Age keeps: the automation and the Archives. */
export const AGE_KEEPS: ContinuityUpgradeId[] = [
  'succession',
  'eternal-dispatch',
  'liaison',
  'archives',
];

// ── Canon — the third prestige layer's shop ──

export type CanonUpgradeId = keyof typeof CANON_PRICES;

export interface CanonUpgradeDef {
  id: CanonUpgradeId;
  displayName: string;
  description: string;
  price: number;
}

export const CANON_UPGRADES: CanonUpgradeDef[] = [
  {
    id: 'crossover',
    displayName: 'Crossover Event',
    description:
      'Rewrites the multiverse for you once pending Continuity reaches your set share of Continuity earned this Age.',
    price: CANON_PRICES.crossover,
  },
  {
    id: 'monitor',
    displayName: 'The Monitor',
    description:
      'Spends Continuity for you: the shop in price order, then the cheapest of Mythic Standing, drills and the Earths.',
    price: CANON_PRICES.monitor,
  },
  {
    id: 'canon-elseworlds',
    displayName: 'Canonical Elseworlds',
    description: 'Each Elseworld can be resolved a fifth time.',
    price: CANON_PRICES['canon-elseworlds'],
  },
];

/** The comic ages, from the one you start in. The Modern Age is the arc's end beat. */
export const AGE_NAMES = ['Golden', 'Silver', 'Bronze', 'Dark', 'Modern'] as const;

/** The age after `turned` Turns of the Age; past the Modern Age it stays Modern. */
export function ageName(turned: number): string {
  return AGE_NAMES[Math.min(turned, AGE_NAMES.length - 1)];
}

// ── Elseworlds — the graded runs ──

export { type ElseworldId };

export interface ElseworldDef {
  id: ElseworldId;
  displayName: string;
  rule: string;
  /** What each completion adds, for the card. */
  reward: string;
  /** Run justice that completes each tier (index 0 is tier 1). */
  goals: number[];
}

const ratioWithRule = (ANCHORS.priceRatio + ELSEWORLD_LEVERS.villainUprisingAdd).toFixed(2);

export const ELSEWORLDS: ElseworldDef[] = [
  {
    id: 'no-powers',
    displayName: 'No Powers: Origin Story',
    rule: 'Back to the origin story, before the powers. Signal Towers, the League and the Bastion produce nothing.',
    reward: 'Street-level tiers (Patrol, Response, Strike) ×4, then ×2 more per tier resolved.',
    goals: ELSEWORLD_GOALS['no-powers'],
  },
  {
    id: 'secret-identity',
    displayName: 'Secret Identity',
    rule: 'Nobody knows who you are. Your Legacy multiplier does nothing.',
    reward: 'Legacy gain ×2 and the Legacy softcap ×3 later, per tier resolved.',
    goals: ELSEWORLD_GOALS['secret-identity'],
  },
  {
    id: 'villain-uprising',
    displayName: 'Villain Uprising',
    rule: `Villains run the black market. Hero prices grow ×${ratioWithRule} per unit.`,
    reward: `Hero prices grow ${ELSEWORLD_LEVERS.villainUprisingRelief(1).toFixed(3)} slower per unit, per tier resolved.`,
    goals: ELSEWORLD_GOALS['villain-uprising'],
  },
  {
    id: 'dark-days',
    displayName: 'Dark Days',
    rule: 'The city has given up. The Network makes no Hope.',
    reward: 'The Network makes Hope ×3 faster, per tier resolved.',
    goals: ELSEWORLD_GOALS['dark-days'],
  },
  {
    id: 'lost-earth',
    displayName: 'Lost Earth',
    rule: 'The other Earths fall silent. Echoes do nothing.',
    reward: 'The Earths make Echoes ×3 faster, per tier resolved.',
    goals: ELSEWORLD_GOALS['lost-earth'],
  },
];

// ── Legends — statistics thresholds stepping the stack ──

export interface LegendDef {
  id: string;
  title: string;
  description: string;
  /** Lifetime justice that earns it. */
  lifetime: number;
}

const LEGEND_TITLES = [
  'Local Hero',
  'Front Page',
  'City Icon',
  'National Treasure',
  'World Shield',
  'Living Myth',
  'Cosmic Sentinel',
  'Multiversal Guardian',
  'Crisis Survivor',
  'Continuity Anchor',
  'Canon Fixture',
  'Event Headliner',
  'Cover Legend',
  'Omnibus Edition',
  'Eternal Paragon',
];

export const LEGENDS: LegendDef[] = LEVERS.legendDecades.map((decade, i) => ({
  id: `legend-${decade}`,
  title: LEGEND_TITLES[i] ?? `Legend ${i + 1}`,
  description: `Earn 1e${decade} Justice across every run. All heroes ×${LEVERS.legendMult}.`,
  lifetime: 10 ** decade,
}));

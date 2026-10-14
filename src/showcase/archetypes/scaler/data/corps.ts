// ─── Skeleton ───
// Paragon's content: what exists and what it is called. Every number is read
// from the spine (`./spine.ts`), so this file holds fiction and shape only.

import {
  ANCHORS,
  ELSEWORLD_GOALS,
  HIGH_TIER_FROM,
  CONTINUITY_PRICES,
  LEVERS,
  LEGACY_PRICES,
  tierCost,
  tierRate,
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

// ── Legacy — the first prestige layer's shop ──

export type LegacyUpgradeId = keyof typeof LEGACY_PRICES | 'training';

export interface LegacyUpgradeDef {
  id: LegacyUpgradeId;
  displayName: string;
  description: string;
  /** One-shot price; Hero Training is leveled and priced by the spine's levers. */
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

export type ContinuityUpgradeId = keyof typeof CONTINUITY_PRICES | 'mythic';

export interface ContinuityUpgradeDef {
  id: ContinuityUpgradeId;
  displayName: string;
  description: string;
  price?: number;
}

export const CONTINUITY_UPGRADES: ContinuityUpgradeDef[] = [
  {
    id: 'eternal-dispatch',
    displayName: 'Eternal Dispatch',
    description: 'Dispatch Desk and Elseworld Protocols survive a Rewrite.',
    price: CONTINUITY_PRICES['eternal-dispatch'],
  },
  {
    id: 'auto-reboot',
    displayName: 'Succession Plan',
    description:
      'Reboots the timeline for you once pending Legacy reaches your set share of Legacy earned.',
    price: CONTINUITY_PRICES['auto-reboot'],
  },
  {
    id: 'mythic',
    displayName: 'Mythic Standing',
    description: `Legacy from every Reboot ×${LEVERS.mythicMult} per level.`,
  },
];

// ── Elseworlds — the graded run ──

export type ElseworldId = keyof typeof ELSEWORLD_GOALS;

export interface ElseworldDef {
  id: ElseworldId;
  displayName: string;
  rule: string;
  reward: string;
  /** Run justice that completes the Elseworld. */
  goalJustice: number;
}

export const ELSEWORLDS: ElseworldDef[] = [
  {
    id: 'no-powers',
    displayName: 'No Powers: Origin Story',
    rule: 'Back to the origin story, before the powers. Signal Towers, the League and the Bastion produce nothing.',
    reward: `Street-level tiers (Patrol, Response, Strike) ×${LEVERS.noPowersRewardMult} forever.`,
    goalJustice: ELSEWORLD_GOALS['no-powers'],
  },
  {
    id: 'secret-identity',
    displayName: 'Secret Identity',
    rule: 'Nobody knows who you are. Your Legacy multiplier does nothing.',
    reward: `Legacy gain ×${LEVERS.secretIdentityRewardMult}, and the Legacy softcap starts ×${LEVERS.secretIdentityKneeMult} later.`,
    goalJustice: ELSEWORLD_GOALS['secret-identity'],
  },
  {
    id: 'villain-uprising',
    displayName: 'Villain Uprising',
    rule: `Villains run the black market. Hero prices grow ×${(ANCHORS.priceRatio + LEVERS.villainUprisingAdd).toFixed(2)} per unit.`,
    reward: `Hero prices grow ${Math.abs(LEVERS.villainUprisingRewardAdd).toFixed(2)} slower per unit forever.`,
    goalJustice: ELSEWORLD_GOALS['villain-uprising'],
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
  'Eternal Paragon',
];

export const LEGENDS: LegendDef[] = LEVERS.legendDecades.map((decade, i) => ({
  id: `legend-${decade}`,
  title: LEGEND_TITLES[i] ?? `Legend ${i + 1}`,
  description: `Earn 1e${decade} Justice across every run. All heroes ×${LEVERS.legendMult}.`,
  lifetime: 10 ** decade,
}));

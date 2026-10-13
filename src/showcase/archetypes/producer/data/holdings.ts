// ─── Skeleton ───
// What the firm can own, sign, earn and hire: every def is generated from the
// spine, so this file names things and the spine prices them. Pure data: no
// engine construction, only `Gate` shapes for when each thing appears or fires.
import type { Gate } from '@open-loop/engine';
import {
  BOOKKEEPER,
  ENDING_AT,
  ENDING_COST,
  GRADES,
  GRADE_MULT,
  HAND_DEAL_MARKS,
  HAVE_AT,
  HIRES,
  INCOME_FIRST,
  INCOME_MARKS,
  LADDER,
  MILESTONE_AT,
  MILESTONE_MULT,
  PHONE_MARKS,
  REFERRAL_AT,
  REFERRAL_STEP,
  REVENUE_FIRST,
  REVENUE_MARKS,
  REVENUE_STEP,
  STANDING_AT,
  STANDING_K,
  SYNERGY_AT,
  SYNERGY_CHEAP,
  SYNERGY_DEAR,
  SYNERGY_PAIRS,
  TIER_COUNT,
  TIP_MARKS,
  TIP_UPGRADE_AT,
  TRAINING_COUNT,
  TRAINING_MULT,
  UPGRADE_AT,
  UPGRADE_MULT,
  gradeThreshold,
  hireCost,
  referralCost,
  standingCost,
  synergyCost,
  tipUpgradeCost,
  trainingCost,
  upgradeCost,
} from './spine';

export const CASH = 'cash';
export const FIRM = 'firm';
export const SUBSIDIARIES = 'subsidiaries';
export const MANAGEMENT = 'management';
export const EXECUTIVES = 'executives';
export const PHONES = 'phones';
export const MILESTONES = 'milestones';
export const GRADES_CATEGORY = 'grades';
export const FEATS = 'feats';
export const STANDING = 'standing';
export const TIP_UPGRADES = 'tip-upgrades';

export interface SubsidiaryDef {
  id: string;
  displayName: string;
  /** What one unit is called in the ledger: "cart", "stand". */
  unit: string;
  blurb: string;
  tier: number;
  baseCost: number;
  baseRate: number;
  visible: Gate;
}

const SUBSIDIARY_NAMES: Array<Pick<SubsidiaryDef, 'id' | 'displayName' | 'unit' | 'blurb'>> = [
  {
    id: 'pushcart',
    displayName: 'Pushcarts',
    unit: 'cart',
    blurb: 'Hot nuts and the evening paper.',
  },
  {
    id: 'newsstand',
    displayName: 'Newsstands',
    unit: 'stand',
    blurb: 'Every corner, every edition.',
  },
  { id: 'diner', displayName: 'Diners', unit: 'diner', blurb: 'Coffee refills are a loss leader.' },
  {
    id: 'laundromat',
    displayName: 'Laundromats',
    unit: 'laundromat',
    blurb: 'Coin-op, open all night.',
  },
  {
    id: 'print-shop',
    displayName: 'Print Shops',
    unit: 'shop',
    blurb: 'Letterhead for the whole town.',
  },
  {
    id: 'trucking',
    displayName: 'Trucking Lines',
    unit: 'line',
    blurb: 'Freight between your own stores.',
  },
  {
    id: 'mill',
    displayName: 'Textile Mills',
    unit: 'mill',
    blurb: 'Uniforms for the trucking lines.',
  },
  { id: 'bank', displayName: 'Savings Banks', unit: 'bank', blurb: 'Lend the town its own money.' },
];

export const SUBSIDIARY_DEFS: SubsidiaryDef[] = SUBSIDIARY_NAMES.map((n, tier) => ({
  ...n,
  tier,
  baseCost: LADDER.baseCost[tier],
  baseRate: LADDER.baseRate[tier],
  // One prospectus open at a time: owning one of the tier below reveals the next. Not lifetime
  // revenue — it runs several tiers ahead of the ladder, since most of it is spent low.
  visible:
    tier === 0
      ? { kind: 'cumulative-gte', resource: CASH, value: 0 }
      : {
          kind: 'count-gte',
          category: SUBSIDIARIES,
          entry: SUBSIDIARY_NAMES[tier - 1].id,
          value: 1,
        },
}));

const ownedGate = (tier: number, value: number): Gate => ({
  kind: 'count-gte',
  category: SUBSIDIARIES,
  entry: SUBSIDIARY_DEFS[tier].id,
  value,
});

/** A one-shot bought on the management board — either a subsidiary upgrade or sales training. */
export interface ManagementDef {
  id: string;
  title: string;
  description: string;
  cost: number;
  mult: number;
  /**
   * What it changes: a subsidiary's rate, the deal, a pair of subsidiaries by
   * each other's counts, or the referral network's add per subsidiary.
   */
  target:
    | { kind: 'subsidiary'; id: string }
    | { kind: 'deal' }
    | { kind: 'synergy'; cheap: string; dear: string }
    | { kind: 'referral'; network: number };
  visible: Gate;
}

const UPGRADE_TITLES: Record<string, string[]> = {
  pushcart: [
    'Bigger Umbrellas',
    'Route Maps',
    'Chestnut Roaster',
    'Ballpark Concession',
    'Cart Franchise',
    'Every Street Corner',
  ],
  newsstand: [
    'Extra Editions',
    'Magazine Racks',
    'Late Final',
    'Paperboy Routes',
    'Wire Photos',
    'Every Station Platform',
  ],
  diner: [
    'Blue Plate Special',
    'Night Shift',
    'Pie Case',
    'Neon Sign',
    'Drive-in Window',
    'Chain Menu',
  ],
  laundromat: [
    'Change Machines',
    'Dry Cleaning',
    'Coin-op Dryers',
    'Pickup and Delivery',
    'Hotel Linen Contract',
    'Uniform Service',
  ],
  'print-shop': [
    'Offset Press',
    'Government Contract',
    'Colour Plates',
    'Phone Book Contract',
    'Ballot Printing',
    'Web Press',
  ],
  trucking: [
    'Diesel Fleet',
    'Interstate License',
    'Refrigerated Trailers',
    'Night Depots',
    'Rail Piggyback',
    'Coast-to-Coast Lanes',
  ],
  mill: [
    'Power Looms',
    'Synthetic Fibre',
    'Dye House',
    'Army Cloth Order',
    'Automatic Shuttles',
    'Export Bales',
  ],
  bank: [
    'Drive-up Teller',
    'Mortgage Desk',
    'Branch Offices',
    'Savings Bonds',
    'Trust Department',
    'Clearing House',
  ],
};

const SYNERGY_TITLES = ['Cross-promotion', 'Joint Venture', 'Merged Operations'];
const REFERRAL_TITLES = [
  'Referral Cards',
  'Trade Association',
  'Chamber of Commerce',
  'Rotary Club',
  'Country Club',
];

const TRAINING_TITLES = ['Firm Handshake', 'Sales Script', 'Rolodex'];

export const MANAGEMENT_DEFS: ManagementDef[] = [
  ...Array.from({ length: TRAINING_COUNT }, (_, k): ManagementDef => ({
    id: `training-${k + 1}`,
    title: TRAINING_TITLES[k],
    description: `Every deal you close pays ×${TRAINING_MULT}.`,
    cost: trainingCost(k),
    mult: TRAINING_MULT,
    target: { kind: 'deal' },
    visible: ownedGate(k, 1),
  })),
  ...SUBSIDIARY_DEFS.flatMap((s) =>
    UPGRADE_AT.map((n, j): ManagementDef => ({
      id: `${s.id}-upgrade-${j + 1}`,
      title: UPGRADE_TITLES[s.id][j],
      description: `${s.displayName} earn ×${UPGRADE_MULT}.`,
      cost: upgradeCost(s.baseCost, n),
      mult: UPGRADE_MULT,
      target: { kind: 'subsidiary', id: s.id },
      visible: ownedGate(s.tier, n),
    })),
  ),
  ...SYNERGY_PAIRS.flatMap(([c, d]) =>
    SYNERGY_AT.map((n, v): ManagementDef => {
      const cheap = SUBSIDIARY_DEFS[c];
      const dear = SUBSIDIARY_DEFS[d];
      return {
        id: `synergy-${cheap.id}-${dear.id}-${v + 1}`,
        title: `${SYNERGY_TITLES[v]}: ${cheap.displayName} and ${dear.displayName}`,
        description: `${cheap.displayName} earn +${SYNERGY_CHEAP * 100}% per ${dear.unit}; ${dear.displayName} +${SYNERGY_DEAR * 100}% per ${cheap.unit}.`,
        cost: synergyCost(LADDER, c, d, n),
        mult: 1,
        target: { kind: 'synergy', cheap: cheap.id, dear: dear.id },
        visible: { kind: 'all', of: [ownedGate(c, n), ownedGate(d, n)] },
      };
    }),
  ),
  ...REFERRAL_AT.map((n, k): ManagementDef => ({
    id: `referral-${k + 1}`,
    title: REFERRAL_TITLES[k],
    description:
      k === 0
        ? `Every deal pays +$${REFERRAL_STEP[0]} per subsidiary the firm owns.`
        : `The referral network pays ×${REFERRAL_STEP[k]}.`,
    cost: referralCost(LADDER, k),
    mult: REFERRAL_STEP[k],
    target: { kind: 'referral', network: k },
    visible: {
      kind: 'all',
      of: [
        { kind: 'count-gte', category: PHONES, entry: 'phone', value: n },
        ...(k > 0
          ? [{ kind: 'active', category: MANAGEMENT, entry: `referral-${k}` } as const]
          : []),
      ],
    },
  })),
];

/** A market-leader milestone: owning N of a subsidiary doubles it. */
export interface MilestoneDef {
  id: string;
  subsidiary: string;
  count: number;
  title: string;
  mult: number;
  requirement: Gate;
}

export const MILESTONE_DEFS: MilestoneDef[] = SUBSIDIARY_DEFS.flatMap((s) =>
  MILESTONE_AT.map((n) => ({
    id: `${s.id}-${n}`,
    subsidiary: s.id,
    count: n,
    title: `${n} ${s.displayName}`,
    mult: MILESTONE_MULT,
    requirement: ownedGate(s.tier, n),
  })),
);

/** Ownership marks past the certificates: an achievement, no multiplier. */
export interface FeatDef {
  id: string;
  title: string;
  /** What the mark reads; the module wires each kind to its live value. */
  kind: 'first' | 'own' | 'revenue' | 'income' | 'phones' | 'tips' | 'deals';
  /** The subsidiary an ownership mark counts. */
  subsidiary?: string;
  threshold: number;
}

const money = (x: number) => `$${x.toExponential(0).replace('e+', 'e')}`;

export const FEAT_DEFS: FeatDef[] = [
  ...SUBSIDIARY_DEFS.map((s): FeatDef => ({
    id: `first-${s.id}`,
    title: `First ${s.unit}`,
    kind: 'first',
    subsidiary: s.id,
    threshold: 1,
  })),
  ...SUBSIDIARY_DEFS.flatMap((s) =>
    HAVE_AT.map((n): FeatDef => ({
      id: `own-${s.id}-${n}`,
      title: `${n} ${s.displayName}`,
      kind: 'own',
      subsidiary: s.id,
      threshold: n,
    })),
  ),
  ...Array.from({ length: REVENUE_MARKS }, (_, k): FeatDef => {
    const v = 10 ** (REVENUE_FIRST + REVENUE_STEP * k);
    return { id: `revenue-${k + 1}`, title: `${money(v)} lifetime`, kind: 'revenue', threshold: v };
  }),
  ...Array.from({ length: INCOME_MARKS }, (_, k): FeatDef => {
    const v = 10 ** (INCOME_FIRST + k);
    return { id: `income-${k + 1}`, title: `${money(v)} a second`, kind: 'income', threshold: v };
  }),
  ...PHONE_MARKS.map((n): FeatDef => ({
    id: `phones-${n}`,
    title: `${n} phones`,
    kind: 'phones',
    threshold: n,
  })),
  ...TIP_MARKS.map((n): FeatDef => ({
    id: `tips-${n}`,
    title: n === 1 ? 'First tip' : `${n} tips caught`,
    kind: 'tips',
    threshold: n,
  })),
  ...HAND_DEAL_MARKS.map((n): FeatDef => ({
    id: `deals-${n}`,
    title: `${n} deals by hand`,
    kind: 'deals',
    threshold: n,
  })),
];

/** A standing upgrade: press that multiplies all income by (1 + standing × k). */
export interface StandingDef {
  id: string;
  title: string;
  description: string;
  cost: number;
  /** Standing it needs. */
  standing: number;
  k: number;
}

const STANDING_TITLES = [
  'Gazette Profile',
  'Trade Journal Cover',
  'Businessman of the Year',
  'Newsreel Feature',
  'Magazine Cover',
  'Radio Interview',
  'Keys to the City',
  'Statue Fund',
  'Encyclopedia Entry',
  'A Street Named for You',
];

export const STANDING_DEFS: StandingDef[] = STANDING_AT.map((standing, k) => ({
  id: `standing-${k + 1}`,
  title: STANDING_TITLES[k],
  description: `All income ×(1 + standing × ${STANDING_K}).`,
  cost: standingCost(LADDER, k),
  standing,
  k: STANDING_K,
}));

/** A tip upgrade, revealed at tips caught. */
export interface TipUpgradeDef {
  id: string;
  title: string;
  description: string;
  cost: number;
  /** Tips caught it needs. */
  caught: number;
}

const TIP_UPGRADE_COPY: [string, string][] = [
  ['Wire Service', 'Tips come twice as often and stay up twice as long.'],
  ['Ticker in the Lobby', 'Tips come twice as often and stay up twice as long.'],
  ['Inside Track', 'Every tip’s effect lasts twice as long.'],
];

export const TIP_UPGRADE_DEFS: TipUpgradeDef[] = TIP_UPGRADE_AT.map((caught, k) => ({
  id: `tip-upgrade-${k + 1}`,
  title: TIP_UPGRADE_COPY[k][0],
  description: TIP_UPGRADE_COPY[k][1],
  cost: tipUpgradeCost(LADDER, k),
  caught,
}));

/** The ending: the firm buys the town's tallest building. */
export interface EndingDef {
  id: 'consolidated-building';
  title: string;
  description: string;
  cost: number;
  visible: Gate;
}

export const ENDING_DEF: EndingDef = {
  id: 'consolidated-building',
  title: 'The Consolidated Building',
  description:
    'The tallest building in town, with the firm’s name on top. Buy it and the town is yours.',
  cost: ENDING_COST,
  visible: ownedGate(TIER_COUNT - 1, ENDING_AT),
};

/** A credit grade, earned on lifetime revenue. */
export interface GradeDef {
  id: string;
  grade: string;
  threshold: number;
  mult: number;
  requirement: Gate;
}

export const GRADE_DEFS: GradeDef[] = GRADES.map((grade, k) => ({
  id: `grade-${grade}`,
  grade,
  threshold: gradeThreshold(LADDER, k),
  mult: GRADE_MULT,
  requirement: { kind: 'cumulative-gte', resource: CASH, value: gradeThreshold(LADDER, k) },
}));

export type HireId = (typeof HIRES)[number]['id'];

export interface ExecutiveDef {
  id: HireId;
  title: string;
  description: string;
  cost: number;
  visible: Gate;
}

const HIRE_COPY: Record<HireId, [string, string]> = {
  'sales-desk': ['Sales Desk', 'A row of telephones closes deals at your pace, so you need not.'],
  'acquisitions-desk': [
    'Acquisitions Desk',
    'Buys the subsidiary that pays itself back soonest, twice a second.',
  ],
  board: ['Board of Directors', 'Approves every management upgrade the moment the money is there.'],
};

export const EXECUTIVE_DEFS: ExecutiveDef[] = HIRES.map((h, j) => {
  const owned = ownedGate(h.revealTier, 1);
  return {
    id: h.id,
    title: HIRE_COPY[h.id][0],
    description: HIRE_COPY[h.id][1],
    cost: hireCost(LADDER, h.priceTier),
    // Hires come in ladder order: each needs the one before it.
    visible:
      j === 0
        ? owned
        : {
            kind: 'all',
            of: [owned, { kind: 'active', category: EXECUTIVES, entry: HIRES[j - 1].id }],
          },
  };
});

/** The night bookkeeper: bought once, it keeps the books while the player is away. */
export interface BookkeeperDef {
  id: 'bookkeeper';
  title: string;
  description: string;
  cost: number;
  visible: Gate;
}

export const BOOKKEEPER_DEF: BookkeeperDef = {
  id: 'bookkeeper',
  title: 'Night Bookkeeper',
  description: 'Keeps the books while you are out, so the firm runs on without you.',
  cost: hireCost(LADDER, BOOKKEEPER.priceTier),
  visible: ownedGate(BOOKKEEPER.revealTier, 1),
};

// ─── Balance ───
// Prices and reveals above come from `./spine.ts`: a subsidiary from the ladder,
// a memo from `upgradeCost` at its reveal count, a synergy from `synergyCost`,
// every other one-shot from the opener of its price tier, and the ending from the
// reference arc. Nothing here is authored as a number.

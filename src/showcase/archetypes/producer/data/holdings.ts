// ─── Skeleton ───
// What the firm can own, sign, earn and hire: every def is generated from the
// spine, so this file names things and the spine prices them. Pure data: no
// engine construction, only `Gate` shapes for when each thing appears or fires.
import type { Gate } from '@open-loop/engine';
import {
  GRADES,
  GRADE_MULT,
  HIRES,
  LADDER,
  MILESTONE_AT,
  MILESTONE_MULT,
  TRAINING_COUNT,
  TRAINING_MULT,
  UPGRADE_AT,
  UPGRADE_MULT,
  gradeThreshold,
  BOOKKEEPER,
  hireCost,
  trainingCost,
  upgradeCost,
} from './spine';

export const CASH = 'cash';
export const FIRM = 'firm';
export const SUBSIDIARIES = 'subsidiaries';
export const MANAGEMENT = 'management';
export const EXECUTIVES = 'executives';

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
  /** Which chain it multiplies: a subsidiary's rate, or the deal. */
  target: { kind: 'subsidiary'; id: string } | { kind: 'deal' };
  visible: Gate;
}

const UPGRADE_TITLES: Record<string, [string, string]> = {
  pushcart: ['Bigger Umbrellas', 'Route Maps'],
  newsstand: ['Extra Editions', 'Magazine Racks'],
  diner: ['Blue Plate Special', 'Night Shift'],
  laundromat: ['Change Machines', 'Dry Cleaning'],
  'print-shop': ['Offset Press', 'Government Contract'],
  trucking: ['Diesel Fleet', 'Interstate License'],
  mill: ['Power Looms', 'Synthetic Fibre'],
  bank: ['Drive-up Teller', 'Mortgage Desk'],
};

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
// a memo from `upgradeCost` at its reveal count, a hire and the bookkeeper from the
// opener of their price tier. Nothing here is authored as a number.

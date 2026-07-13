// ─── Upgrades ────────────────────────────────────────────────────────────────
// Sources:
//   - `Game.MakeTiered` / `Game.TieredUpgrade` helpers: `main.js:10145–10155`.
//     Non-cursor tier-N cost = building.basePrice × `Game.Tiers[tier].price`;
//     ×2 multiplier wired into building rate function on purchase.
//   - Cursor tier block: `main.js:10236–10238` (Reinforced index finger,
//     Carpal tunnel prevention cream, Ambidextrous) — costs hand-set in
//     canonical (100 / 500 / 10000), not derived from basePrice formula.
//   - Thousand fingers cross-building series: `main.js:10239–10243`
//     (Thousand / Million / Billion / Trillion / Quadrillion fingers).
//     Per-tier cost hand-set; `getStrThousandFingersGain(mult)` describes
//     the per-non-cursor-building flat bonus.
//   - Per-building tier upgrade names: `main.js:10246–10914` (Grandma
//     tier 1-3 at :10248-10250, Farm at :10252-10254, etc.).
//
// First-arc upgrade scope landed here:
//   - 3 cursor tier upgrades (binding to ['click', 'cursor'])
//   - 9 non-cursor buildings × 3 tiers = 27 tiered ×2 upgrades
//     (Grandma → Alchemy lab; later-building tiers + tier-4+ defer to a
//     later integration leaf when their owned-count unlock gates land)
//   - 1 Thousand fingers cross-building bonus entry (enough for demo
//     arc beat 5 "First global bonus upgrade fires"; Million through
//     Septillion fingers gated by cursor-count thresholds — extends with
//     the achievement-unlock pass at leaf 4)
//
// Canonical tier-cost ratios (from `Game.Tiers[tier].price`):
//   tier 1 ×10, tier 2 ×100, tier 3 ×500.
// ─────────────────────────────────────────────────────────────────────────────

import type { UpgradeDef } from './types';

const TIER_COST_RATIOS: Record<number, number> = {
  1: 10,
  2: 100,
  3: 500,
};

interface TierUpgradeRow {
  buildingId: string;
  buildingBasePrice: number;
  tiers: { tier: 1 | 2 | 3; name: string }[];
}

const TIER_UPGRADES: TierUpgradeRow[] = [
  {
    buildingId: 'grandma',
    buildingBasePrice: 100,
    tiers: [
      { tier: 1, name: 'Forwards from grandma' },
      { tier: 2, name: 'Steel-plated rolling pins' },
      { tier: 3, name: 'Lubricated dentures' },
    ],
  },
  {
    buildingId: 'farm',
    buildingBasePrice: 1_100,
    tiers: [
      { tier: 1, name: 'Cheap hoes' },
      { tier: 2, name: 'Fertilizer' },
      { tier: 3, name: 'Cookie trees' },
    ],
  },
  {
    buildingId: 'mine',
    buildingBasePrice: 12_000,
    tiers: [
      { tier: 1, name: 'Sugar gas' },
      { tier: 2, name: 'Megadrill' },
      { tier: 3, name: 'Ultradrill' },
    ],
  },
  {
    buildingId: 'factory',
    buildingBasePrice: 130_000,
    tiers: [
      { tier: 1, name: 'Sturdier conveyor belts' },
      { tier: 2, name: 'Child labor' },
      { tier: 3, name: 'Sweatshop' },
    ],
  },
  {
    buildingId: 'bank',
    buildingBasePrice: 1_400_000,
    tiers: [
      { tier: 1, name: 'Taller tellers' },
      { tier: 2, name: 'Scissor-resistant credit cards' },
      { tier: 3, name: 'Acid-proof vaults' },
    ],
  },
  {
    buildingId: 'temple',
    buildingBasePrice: 20_000_000,
    tiers: [
      { tier: 1, name: 'Golden idols' },
      { tier: 2, name: 'Sacrifices' },
      { tier: 3, name: 'Delicious blessing' },
    ],
  },
  {
    buildingId: 'wizard-tower',
    buildingBasePrice: 330_000_000,
    tiers: [
      { tier: 1, name: 'Pointier hats' },
      { tier: 2, name: 'Beardlier beards' },
      { tier: 3, name: 'Ancient grimoires' },
    ],
  },
  {
    buildingId: 'shipment',
    buildingBasePrice: 5_100_000_000,
    tiers: [
      { tier: 1, name: 'Vanilla nebulae' },
      { tier: 2, name: 'Wormholes' },
      { tier: 3, name: 'Frequent flyer' },
    ],
  },
  {
    buildingId: 'alchemy-lab',
    buildingBasePrice: 75_000_000_000,
    tiers: [
      { tier: 1, name: 'Antimony' },
      { tier: 2, name: 'Essence of dough' },
      { tier: 3, name: 'True chocolate' },
    ],
  },
];

function tieredUpgrade(
  buildingId: string,
  buildingBasePrice: number,
  tier: 1 | 2 | 3,
  name: string,
): UpgradeDef {
  return {
    id: `${buildingId}-tier-${tier}`,
    name,
    description: `${capitalize(buildingId)}s are twice as efficient.`,
    cost: buildingBasePrice * TIER_COST_RATIOS[tier],
    kind: 'multiplier',
    targetProducerId: buildingId,
    multiplier: 2,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

const CURSOR_TIER_UPGRADES: UpgradeDef[] = [
  {
    id: 'cursor-tier-1',
    name: 'Reinforced index finger',
    description: 'The mouse and cursors are twice as efficient.',
    cost: 100,
    kind: 'multiplier',
    targetProducerId: ['click', 'cursor'],
    multiplier: 2,
  },
  {
    id: 'cursor-tier-2',
    name: 'Carpal tunnel prevention cream',
    description: 'The mouse and cursors are twice as efficient.',
    cost: 500,
    kind: 'multiplier',
    targetProducerId: ['click', 'cursor'],
    multiplier: 2,
  },
  {
    id: 'cursor-tier-3',
    name: 'Ambidextrous',
    description: 'The mouse and cursors are twice as efficient.',
    cost: 10_000,
    kind: 'multiplier',
    targetProducerId: ['click', 'cursor'],
    multiplier: 2,
  },
];

const THOUSAND_FINGERS: UpgradeDef = {
  id: 'thousand-fingers',
  name: 'Thousand fingers',
  description: 'The mouse and cursors gain +0.1 cookies for each non-cursor building owned.',
  cost: 100_000,
  kind: 'cross-building-click-bonus',
  perNonCursorBuilding: 0.1,
};

export const UPGRADES: UpgradeDef[] = [
  ...CURSOR_TIER_UPGRADES,
  ...TIER_UPGRADES.flatMap((row) =>
    row.tiers.map(({ tier, name }) =>
      tieredUpgrade(row.buildingId, row.buildingBasePrice, tier, name),
    ),
  ),
  THOUSAND_FINGERS,
];

/** Tier-1 upgrade ids (fork-API surface for "cheapest path through the
 *  upgrade ladder"). Includes the cursor's tier-1 and every non-cursor
 *  building's tier-1. */
export const TIER1_UPGRADE_IDS: string[] = [
  'cursor-tier-1',
  ...TIER_UPGRADES.map((row) => `${row.buildingId}-tier-1`),
];

// ─── Balance ────────────────────────────────────────────────────────────────
// The multiplier half of Producer's spine (see `../IDENTITY.md` § Rate-function
// spine; the geometric cost ladder lives in `producers.ts` § Balance). Upgrades
// are the modifier PRODUCT — each `kind: 'multiplier'` row folds a ×2 into its
// building's rate chain on purchase:
//
//   headlineMult = Π_bought upgrade.multiplier × achievementMult × milestoneMult
//
// Compounding is multiplicative, so the headline grows geometrically in the
// number of stacked multipliers even while any single producer's count grows
// only logarithmically in cookies (the cost ladder). That gap — log climb,
// geometric reward — is the "watch the multiplier scroll" payoff the
// signature-compound beat locks. The ×2 per tier is the invention knob a fork
// retunes (perturbation surface, not a lifted constant).

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

// Canonical `Game.Tiers[n].price` ladder (main.js:10111–10120): the per-tier
// cost is `building.basePrice × ratio`. The first-arc port stopped at tier 3;
// tiers 4–6 extend the ×2 ladder with the real ratios so a mature building's
// headline can climb past ×8. (CC's tier 2 is ×50, not the port's original
// ×100 — realigned here now that the ladder ports authentically.)
type Tier = 1 | 2 | 3 | 4 | 5 | 6;
const TIER_COST_RATIOS: Record<Tier, number> = {
  1: 10,
  2: 50,
  3: 500,
  4: 50_000,
  5: 5_000_000,
  6: 500_000_000,
};

interface TierUpgradeRow {
  buildingId: string;
  buildingBasePrice: number;
  tiers: { tier: Tier; name: string }[];
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
  tier: Tier,
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

// Tiers 4–6 extend every building's ×2 ladder without hand-authoring 27 more
// canonical flavor names (CC's are building-specific; ours are cosmetic
// placeholders — the mechanic, not the label, is what ports). The cost ratios
// climb steeply (×50k / ×5M / ×500M of basePrice) so these only bind on the
// cheaper buildings a mature arc can actually afford to deepen.
const EXTENDED_TIERS: Tier[] = [4, 5, 6];
const EXTENDED_TIER_PREFIX: Record<number, string> = {
  4: 'Reinforced',
  5: 'Industrial',
  6: 'Quantum',
};

function extendedTierUpgrades(row: TierUpgradeRow): UpgradeDef[] {
  return EXTENDED_TIERS.map((tier) =>
    tieredUpgrade(
      row.buildingId,
      row.buildingBasePrice,
      tier,
      `${EXTENDED_TIER_PREFIX[tier]} ${row.buildingId.replace(/-/g, ' ')}s`,
    ),
  );
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

// ─── Global production multipliers (flat research chain) ─────────────────────
// The port's headline-wide multiplier lane, and the dominant lever on the late
// arc. Canonical CC reaches its high-CpS "watch it scroll" state through GLOBAL
// multipliers stacked on top of the per-building tier ladder. This chain ports
// the flat "cookie production multiplier" research upgrades (`main.js:5177–5218`,
// each folding a fixed factor into the one `Game.cookiesPs *= mult` term) — the
// count-scaled milk/kitten chain (`main.js:5240`, `:5256–5271`) is a SEPARATE
// global, already stood in for by the per-achievement ×1.02 in
// `modules/achievements.ts`.
//
// Bound headline-wide (`targetProducerId: null` → every producer's rate chain),
// one-shot, and bounded by chain length, so it's stable — the effect can't run
// away, only the cost-gated purchase timing paces it. Costs climb ×8 per rung
// from 5e5 so the chain ramps across the mid-to-late arc (first rung affordable
// ~25min) without touching the opening beats. Rung count + base cost + scaling
// are the primary knobs for landing beat-7 (total CpS ≥ 1e6) in its window.
const GLOBAL_MULT_BASE_COST = 500_000;
const GLOBAL_MULT_COST_SCALING = 8;
const GLOBAL_MULT_COUNT = 4;
const GLOBAL_MULT_NAMES = [
  'Specialized chocolate chips',
  'Designer cocoa beans',
  'Ritual rolling pins',
  'Underworld ovens',
  'One mind',
  'Exotic nuts',
  'Communal brainsweep',
  'Arcane sugar',
];

const GLOBAL_MULT_UPGRADES: UpgradeDef[] = Array.from({ length: GLOBAL_MULT_COUNT }, (_, i) => ({
  id: `global-mult-${i + 1}`,
  name: GLOBAL_MULT_NAMES[i] ?? `Global production ${i + 1}`,
  description: 'Cookie production is twice as efficient across the board.',
  cost: Math.round(GLOBAL_MULT_BASE_COST * GLOBAL_MULT_COST_SCALING ** i),
  kind: 'multiplier',
  targetProducerId: null,
  multiplier: 2,
}));

export const UPGRADES: UpgradeDef[] = [
  ...CURSOR_TIER_UPGRADES,
  ...TIER_UPGRADES.flatMap((row) => [
    ...row.tiers.map(({ tier, name }) =>
      tieredUpgrade(row.buildingId, row.buildingBasePrice, tier, name),
    ),
    ...extendedTierUpgrades(row),
  ]),
  THOUSAND_FINGERS,
  ...GLOBAL_MULT_UPGRADES,
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

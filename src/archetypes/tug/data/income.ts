import type { IncomeUpgradeDef } from './types';

// ─── Skeleton ───
// 3 income-upgrade tiers (skeleton cardinality). Multipliers stack
// sequentially (tier 1 active → ×1.5; tier 2 → ×1.5×1.4; tier 3 →
// ×1.5×1.4×1.3 ≈ ×2.73). Costs scale much faster than the cumulative
// payoff so the buy-now-vs-bank-for-units tension stays sharp throughout
// a single 30-min match.

// ─── Costume ───
// Theme C SciFi Armada labels. `Refinery I/II/III` = mineral-extraction
// tier upgrades, idiomatic to the StarCraft / Direct Strike economy.

// ─── Balance ───
// First-cut placeholders chosen for ratio shape; retunes against the
// Tier-C tuner's beat-2/3/5 fire-time bands.

export const INCOME_UPGRADES: IncomeUpgradeDef[] = [
  {
    id: 'refinery-1',
    name: 'Refinery I',
    cost: 400,
    multiplier: 1.25,
  },
  {
    id: 'refinery-2',
    name: 'Refinery II',
    cost: 350,
    multiplier: 1.4,
  },
  {
    id: 'refinery-3',
    name: 'Refinery III',
    cost: 1_200,
    multiplier: 1.3,
  },
];

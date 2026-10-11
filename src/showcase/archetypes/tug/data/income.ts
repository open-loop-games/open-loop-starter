import type { IncomeUpgradeDef } from './types';

// ─── Skeleton ───
// 3 income-upgrade tiers (skeleton cardinality), gated sequentially — tier N
// requires tier N-1 bought, so the ladder is a path rather than a menu.

// ─── Costume ───
// Theme C SciFi Armada labels. `Refinery I/II/III` = mineral-extraction
// tier upgrades, idiomatic to the StarCraft / Direct Strike economy.

// ─── Balance ───
// Multipliers stack multiplicatively down the path and taper — ×1.5, then
// ×1.4, then ×1.3, for a cumulative ×2.73 with all three bought. The taper is
// the point: each rung buys less than the last, so there is always a tier at
// which units beat economy.
//
// Costs climb ×3 per rung against a payoff climbing ×1.4 then ×1.3, which is
// what keeps the buy-now-vs-bank-for-units tension sharp across a 30-min match
// rather than letting economy run away. Payback at the base rate of 8/s, each
// tier read from the state the previous one left (rate = 8 · Π prior mults):
//
//   refinery-1   400 / (8 · 0.5)     =  100s
//   refinery-2  1200 / (12 · 0.4)    =  250s
//   refinery-3  3600 / (16.8 · 0.3)  =  714s
//
// The last rung's payback sits near half the match limit — deliberately
// marginal, so committing to it is a real bet rather than an automatic buy.
// `balance/roi-probe.ts` prints these against the match duration; per-tier
// `cost` and `multiplier` are tunable surfaces in `modules/income-upgrades.ts`,
// perturbed via `pushOverrides` on `income-upgrades/<id>/{cost,multiplier}`.

export const INCOME_UPGRADES: IncomeUpgradeDef[] = [
  {
    id: 'refinery-1',
    name: 'Refinery I',
    cost: 400,
    multiplier: 1.5,
  },
  {
    id: 'refinery-2',
    name: 'Refinery II',
    cost: 1_200,
    multiplier: 1.4,
  },
  {
    id: 'refinery-3',
    name: 'Refinery III',
    cost: 3_600,
    multiplier: 1.3,
  },
];

import type { AutoProducerDef } from './types';

// ─── Skeleton ───
// 5 continuous tiers. No click-producer entry — Ambient's zero-click
// contract means there is no manual trigger.
// Planter seeds at initialAmount: 1 so beat-1 ("First passive production
// visible") is reachable on cold boot. Other tiers gate on lifetime
// thresholds via `unlocks.ts`.

// ─── Costume ───
// Cozy Farm theme: planter / coop / pond / pasture / orchard.

// Multiplicative per-purchase cost growth. Inlined rather than wrapped in
// `tunable()`: `ProducerMapping.purchase.costScaling` is read once at producer
// registration, so a registered knob here would never be re-read. Sweeping it
// means editing this constant and re-running the solver. A cost curve that
// needs to be perturbable — or invertible, for bulk-purchase math — is composed
// as a `Formula` at the wiring layer instead of through this shorthand field;
// see `costCurve` in `src/balance/cost-curve.ts`.
const COST_SCALING = 1.08;

export const AUTO_PRODUCERS: AutoProducerDef[] = [
  {
    id: 'planter',
    name: 'Planter',
    baseRate: 0.5,
    purchase: { baseCost: 55, costScaling: COST_SCALING, initialAmount: 1 },
  },
  {
    id: 'coop',
    name: 'Coop',
    baseRate: 4,
    purchase: { baseCost: 75, costScaling: COST_SCALING },
  },
  {
    id: 'pond',
    name: 'Pond',
    baseRate: 32,
    purchase: { baseCost: 1_100, costScaling: COST_SCALING },
  },
  {
    id: 'pasture',
    name: 'Pasture',
    baseRate: 220,
    purchase: { baseCost: 18_000, costScaling: COST_SCALING },
  },
  {
    id: 'orchard',
    name: 'Orchard',
    baseRate: 1500,
    purchase: { baseCost: 320_000, costScaling: COST_SCALING },
  },
];

// ─── Balance ────────────────────────────────────────────────────────────────
// Rate-function bucket: geometric cost-scaling (the Cost-Scaling family; see
// `../IDENTITY.md` § Rate-function spine), the same family tuned
// *gentle* for the no-pressure contract. Each tier is a geometric price ladder,
// so its count is logarithmic in accumulated primary:
//
//   cost(n)  = baseCost · COST_SCALING^n            (COST_SCALING = 1.08)
//   n_afford ≈ log_1.08( 1 + sprouts·(1.08−1)/baseCost )   [geometric-series inverse]
//
// The 1.08 growth (vs the genre-default 1.15) is the load-bearing cozy knob: a shallower
// ladder means owned-count keeps climbing for hours without a wall, so the arc is
// multi-hour cumulative rather than a steep session sprint. Headline output =
// Σ_tiers (count · baseRate) × the achievement modifier product (each earned
// achievement folds `DEFAULT_ACHIEVEMENT_MULTIPLIER` into the chain, per
// `../modules/achievements.ts`). There is NO click channel at all — all
// income flows through `getTotalRate`, which is what lets the harness read the
// arc through `stasis-aware-tick` (see `../BALANCING.md` § Couplings).
//
// The per-tier (baseCost / baseRate) ratios climb 110 / 19 / 34 / 82 / 213: coop
// is a deliberate early payback dip (the "first purchased producer feels good"
// beat), then the ladder resumes its gentle climb. That shape is the pacing
// invariant a fork retunes; the 1.08 steepness stays fixed for the reason given
// at `COST_SCALING` above.

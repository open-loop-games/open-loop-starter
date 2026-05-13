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
// `tunable()` because `ProducerMapping.purchase.costScaling` is static
// `DecimalSource` (not Computable) — read once at producer registration,
// not re-read on retune. Bisecting this knob requires an engine change
// (Computable adoption on `costScaling` with `unref` at the read site).
// Same negative criterion as producer's `defaultCostScaling = 1.15`; see
// `BALANCING-producer.md` § first engine-surface gap.
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

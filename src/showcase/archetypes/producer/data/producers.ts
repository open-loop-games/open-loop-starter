// ─── Producers ────────────────────────────────────────────────────────────────
// Sources:
//   - Click activity → `main.js:4988–5057` (`Game.ClickCookie`). The big
//     cookie click grants `Game.computedMouseCps` per fire. Base click
//     value is 1 cookie before any upgrades stack into the click chain.
//   - Building tier constructor → `main.js:7982` (`Game.Object`). For
//     non-cursor buildings (`this.n != 0`), basePrice + baseCps are
//     computed from `n` in the constructor body
//     (`main.js:8014–8038`), then digit-rounded; the constructor's
//     `price` + `cps` positional args feed through only for the cursor.
//     Formula:
//       baseCps   = round(ceil(n^(n/2 + 2) * 10) / 10)        [digit-rounded]
//       basePrice = (n + 9 + (n<5 ? 0 : 5*(n-5)^1.75)) * 10^n
//                   * max(1, n-14)                            [digit-rounded]
//                   * extra ×10 / ×10 / ×10 / ×20 for n=16/17/18/19
//   - Per-building definitions → `main.js:8979–9302` (cursor through
//     final pre-ascension tier). Canonical first-arc scope is every
//     building before first ascension; the upper tiers stay invisible
//     until their owned-count visibility gates unlock from sibling
//     building counts (lands at leaf 3 with the Game.Unlock chain).
//
// Per spec § 4 ProducerDef:
//   - `trigger: 'manual'` for click → no `purchase` block; bound to the
//     click handler via the producers module.
//   - `trigger: 'continuous'` for buildings → `purchase: { baseCost,
//     costScaling }`. `costScaling = balance.defaultCostScaling` (1.15
//     per the canonical `priceFunc` closure).
//
// Numeric anchoring: values >= 1e16 are string-literal `DecimalSource`
// to avoid JS float precision loss past 2^53 (~9e15). Below that, raw
// numeric literals carry through.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducerDef } from './types';

/** Stable id for the click activity. Referenced as `targetProducerId` on
 *  cursor-scoped upgrades and as the manual-trigger producer's category
 *  entry id. */
export const CLICK_PRODUCER_ID = 'click';

// Geometric per-unit cost growth — Cookie Clicker default 1.15. Source:
// `defaultCostScaling = 1.15` → `priceFunc` closure on `Game.Object`
// constructor (`main.js:7982`). Not tunable: the engine's
// `ProducerMapping.purchase.costScaling` is static `DecimalSource`, not
// Computable, so the value is read once at producer registration and
// can't retune via tunable(). Filed as candidate primitive when a fork
// wants to bisect this knob.
const COST_SCALING = 1.15;

const CLICK_PRODUCER: ProducerDef = {
  id: CLICK_PRODUCER_ID,
  name: 'Big cookie',
  trigger: 'manual',
  baseRate: 1,
};

const BUILDINGS: ProducerDef[] = [
  // n=0
  {
    id: 'cursor',
    name: 'Cursor',
    trigger: 'continuous',
    baseRate: 0.1,
    purchase: { baseCost: 15, costScaling: COST_SCALING },
  },
  // n=1
  {
    id: 'grandma',
    name: 'Grandma',
    trigger: 'continuous',
    baseRate: 1,
    purchase: { baseCost: 100, costScaling: COST_SCALING },
  },
  // n=2
  {
    id: 'farm',
    name: 'Farm',
    trigger: 'continuous',
    baseRate: 8,
    purchase: { baseCost: 1_100, costScaling: COST_SCALING },
  },
  // n=3
  {
    id: 'mine',
    name: 'Mine',
    trigger: 'continuous',
    baseRate: 47,
    purchase: { baseCost: 12_000, costScaling: COST_SCALING },
  },
  // n=4
  {
    id: 'factory',
    name: 'Factory',
    trigger: 'continuous',
    baseRate: 260,
    purchase: { baseCost: 130_000, costScaling: COST_SCALING },
  },
  // n=5
  {
    id: 'bank',
    name: 'Bank',
    trigger: 'continuous',
    baseRate: 1_400,
    purchase: { baseCost: 1_400_000, costScaling: COST_SCALING },
  },
  // n=6
  {
    id: 'temple',
    name: 'Temple',
    trigger: 'continuous',
    baseRate: 7_800,
    purchase: { baseCost: 20_000_000, costScaling: COST_SCALING },
  },
  // n=7
  {
    id: 'wizard-tower',
    name: 'Wizard tower',
    trigger: 'continuous',
    baseRate: 44_000,
    purchase: { baseCost: 330_000_000, costScaling: COST_SCALING },
  },
  // n=8
  {
    id: 'shipment',
    name: 'Shipment',
    trigger: 'continuous',
    baseRate: 260_000,
    purchase: { baseCost: 5_100_000_000, costScaling: COST_SCALING },
  },
  // n=9
  {
    id: 'alchemy-lab',
    name: 'Alchemy lab',
    trigger: 'continuous',
    baseRate: 1_600_000,
    purchase: { baseCost: 75_000_000_000, costScaling: COST_SCALING },
  },
  // n=10
  {
    id: 'portal',
    name: 'Portal',
    trigger: 'continuous',
    baseRate: 10_000_000,
    purchase: { baseCost: 1_000_000_000_000, costScaling: COST_SCALING },
  },
  // n=11
  {
    id: 'time-machine',
    name: 'Time machine',
    trigger: 'continuous',
    baseRate: 65_000_000,
    purchase: { baseCost: 14_000_000_000_000, costScaling: COST_SCALING },
  },
  // n=12
  {
    id: 'antimatter-condenser',
    name: 'Antimatter condenser',
    trigger: 'continuous',
    baseRate: 430_000_000,
    purchase: { baseCost: 170_000_000_000_000, costScaling: COST_SCALING },
  },
  // n=13
  {
    id: 'prism',
    name: 'Prism',
    trigger: 'continuous',
    baseRate: 2_900_000_000,
    purchase: { baseCost: 2_100_000_000_000_000, costScaling: COST_SCALING },
  },
  // n=14
  {
    id: 'chancemaker',
    name: 'Chancemaker',
    trigger: 'continuous',
    baseRate: 21_000_000_000,
    purchase: { baseCost: '26000000000000000', costScaling: COST_SCALING },
  },
  // n=15
  {
    id: 'fractal-engine',
    name: 'Fractal engine',
    trigger: 'continuous',
    baseRate: 150_000_000_000,
    purchase: { baseCost: '310000000000000000', costScaling: COST_SCALING },
  },
  // n=16
  {
    id: 'javascript-console',
    name: 'Javascript console',
    trigger: 'continuous',
    baseRate: 1_100_000_000_000,
    purchase: { baseCost: '71000000000000000000', costScaling: COST_SCALING },
  },
  // n=17
  {
    id: 'idleverse',
    name: 'Idleverse',
    trigger: 'continuous',
    baseRate: 8_300_000_000_000,
    purchase: { baseCost: '12000000000000000000000', costScaling: COST_SCALING },
  },
  // n=18
  {
    id: 'cortex-baker',
    name: 'Cortex baker',
    trigger: 'continuous',
    baseRate: 64_000_000_000_000,
    purchase: { baseCost: '1900000000000000000000000', costScaling: COST_SCALING },
  },
  // n=19
  {
    id: 'you',
    name: 'You',
    trigger: 'continuous',
    baseRate: 510_000_000_000_000,
    purchase: { baseCost: '540000000000000000000000000', costScaling: COST_SCALING },
  },
];

export const PRODUCERS: ProducerDef[] = [CLICK_PRODUCER, ...BUILDINGS];

/** Building tier ids in canonical order (cursor through final pre-ascension
 *  tier). Excludes the click producer — milestones / cost-curve modules
 *  iterate this list to skip the manual-trigger entry. */
export const CONTINUOUS_PRODUCER_IDS: string[] = BUILDINGS.map((b) => b.id);

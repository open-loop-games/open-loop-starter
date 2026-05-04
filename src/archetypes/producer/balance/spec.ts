/**
 * Closed-form spec layer — per-tier first-passage and triangular composition.
 *
 * Single-tier shape: cost geometric in count, production linear in count,
 * no upgrades, no global modifiers, no cross-tier production. Triangular
 * composition (`arcTimeUnderTierOrder`) chains tiers under a strict
 * purchase order: lower tiers' frozen counts feed the rate while a higher
 * tier expands. The lowest-tier bootstrap (count 0 → 1 with no external
 * rate, e.g. cursor seeded by clicks) stays bot territory.
 *
 *   rate-function-algebra.md §2.4   geometric cost
 *   rate-function-algebra.md §2.10  rate × state-independent modifier
 *   rate-function-algebra.md §3.1   sum composition
 *   rate-function-algebra.md §6.3   triangular systems
 *   rate-function-algebra.md §6.6   series composition
 *   rate-function-algebra.md §7.2   last-K-levels lemma (cost-side)
 *   case-studies/core-timing-formula.md §4.1, §5, §6
 *
 * Forward sums close per §3.1; the inverse N(T) does not in elementary
 * terms because the m^k / k mix is polylog territory — caller either
 * evaluates the forward sum or bisects.
 */

import { PRODUCERS } from '../data/producers';

export interface SingleTierShape {
  id: string;
  /** Geometric cost growth m. */
  costScaling: number;
  /** First-purchase cost C₀ (currency). */
  baseCost: number;
  /** Per-unit rate r (currency/sec). */
  baseRate: number;
}

/** Cost(n) = C₀ · m^(n-1) for the n-th purchase (1-indexed). algebra §2.4. */
export function costAt(shape: SingleTierShape, n: number): number {
  return shape.baseCost * Math.pow(shape.costScaling, n - 1);
}

/** Production(count) = count · r. algebra §2.10 with identity modifier. */
export function productionAtCount(shape: SingleTierShape, count: number): number {
  return count * shape.baseRate;
}

/**
 * Beat interval with an external rate from frozen lower tiers added in:
 *   r_total = count · r + externalRate
 *   Δt = Cost(count+1) / r_total
 * Sum composition per algebra §3.1. Reduces to the single-tier `intervalAtCount`
 * when externalRate = 0. count = 0 with externalRate > 0 models the bootstrap
 * of a higher tier seeded by lower-tier production.
 */
export function intervalAtCountWithBase(
  shape: SingleTierShape,
  count: number,
  externalRate: number,
): number {
  const rate = count * shape.baseRate + externalRate;
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  return costAt(shape, count + 1) / rate;
}

/**
 * Beat interval Δt(count) = Cost(count+1) / Production(count). The genre's
 * core timing formula (core-timing-formula §4.1). Diverges at count = 0.
 */
export function intervalAtCount(shape: SingleTierShape, count: number): number {
  return intervalAtCountWithBase(shape, count, 0);
}

/** Cumulative steady-state time `from` → `to`. Forward sum, no closed-form inverse. */
export function cumulativeTimeFrom(shape: SingleTierShape, from: number, to: number): number {
  if (from < 1 || to <= from) return 0;
  let total = 0;
  for (let k = from; k < to; k++) total += intervalAtCount(shape, k);
  return total;
}

/** Doubling level d = ln 2 / ln m. algebra §2.4 characteristic timescale. */
export function doublingLevels(shape: SingleTierShape): number {
  return Math.log(2) / Math.log(shape.costScaling);
}

/** Beat-expansion T(n) / T(1) on the steady-state interval. core-timing-formula §5. */
export function beatExpansion(shape: SingleTierShape, n: number): number {
  return intervalAtCount(shape, n) / intervalAtCount(shape, 1);
}

/**
 * Fraction of cumulative steady-state time spent in the last K of N
 * purchases. Computed from the forward sum because production growing
 * linearly in count breaks the pure-geometric form of algebra §7.2;
 * collapses to (1 − m^-K) when production is constant.
 */
export function lastKShare(shape: SingleTierShape, N: number, K: number): number {
  const total = cumulativeTimeFrom(shape, 1, N);
  if (total === 0) return 0;
  const tail = cumulativeTimeFrom(shape, Math.max(1, N - K), N);
  return tail / total;
}

/**
 * Per-tier shapes pulled from `data/producers.ts` — single source of truth.
 * One row per continuous producer. The triangular composer below assembles
 * these per algebra §6.3 / §6.6.
 */
export const TIER_SHAPES: Readonly<Record<string, SingleTierShape>> = (() => {
  const shapes: Record<string, SingleTierShape> = {};
  for (const p of PRODUCERS) {
    if (p.trigger !== 'continuous' || !p.purchase) continue;
    shapes[p.id] = {
      id: p.id,
      costScaling: Number(p.purchase.costScaling),
      baseCost: Number(p.purchase.baseCost),
      baseRate: Number(p.baseRate),
    };
  }
  return shapes;
})();

export function tierShape(id: string): SingleTierShape {
  const s = TIER_SHAPES[id];
  if (!s) throw new Error(`tierShape: no continuous tier '${id}'`);
  return s;
}

export interface TierStep {
  /** Continuous tier id to expand. */
  id: string;
  /** Count to grow to. No-op if not strictly greater than the current accumulated count. */
  to: number;
}

/**
 * Cumulative time under a strict-tier-order schedule. Each step grows one
 * tier's count to `to`; counts established by earlier steps freeze and
 * contribute as `externalRate` for later steps.
 *
 * Triangular per algebra §6.3 — the production of step i depends only on
 * counts established by steps 1..i. Series composition per §6.6 — total
 * is Σ per-step first-passages.
 *
 * `initial` seeds counts before the first step; pass `{ cursor: 1 }` (or
 * similar) to skip the click-driven bootstrap. A schedule whose first
 * step grows the lowest tier from 0 with empty `initial` returns `+∞`
 * for that segment — the spec correctly refusing to model bot territory.
 */
export function arcTimeUnderTierOrder(
  schedule: readonly TierStep[],
  initial: Readonly<Record<string, number>> = {},
): number {
  const counts: Record<string, number> = { ...initial };
  let total = 0;
  for (const step of schedule) {
    const shape = tierShape(step.id);
    const from = counts[step.id] ?? 0;
    if (step.to <= from) continue;
    let externalRate = 0;
    for (const [id, c] of Object.entries(counts)) {
      if (id === step.id) continue;
      externalRate += c * tierShape(id).baseRate;
    }
    for (let k = from; k < step.to; k++) {
      total += intervalAtCountWithBase(shape, k, externalRate);
    }
    counts[step.id] = step.to;
  }
  return total;
}

/**
 * Cost-curve constructors — the three canonical cost-scaling families as
 * engine `Formula` chains in level `n`.
 *
 * Balance tooling wants the *curve*, not one sample off it. A Formula
 * inverts (`calculateMaxAffordable`, `tryInvert`, `firstPassage`), integrates
 * (`calculateCost` for cumulative spend), and divides by a production rate to
 * give beat time — `curve.div(rate)` — so nothing downstream has to re-derive
 * `Cost(n)` by hand to get at the numerator.
 *
 * `costMultiplier` is one authored knob read three ways, matching how
 * archetype `data/*.ts` already declares `costScaling`:
 *
 * - `exponential` — `baseCost · costMultiplier^n`. The genre default
 *   (Cookie Clicker's 1.15).
 * - `linear` — `baseCost · (1 + (costMultiplier − 1) · n)`: the knob read as
 *   a per-level fraction of base rather than a ratio.
 * - `polynomial` — `baseCost · n^costMultiplier`: the knob read as the
 *   exponent.
 */

import {
  Decimal,
  Formula,
  type DecimalSource,
  type GenericFormula,
  type Ref,
} from '@open-loop/engine';

/** Cost-scaling family — how `Cost(n)` grows with level. */
export type CostScalingFamily = 'exponential' | 'linear' | 'polynomial';

/** Authored cost-scaling parameters, as they appear in archetype `data/`. */
export interface CostCurveParams {
  /** Cost of the purchase at level 0. */
  baseCost: DecimalSource;
  /** Per-level scaling knob — read per `family`, see the module header. */
  costMultiplier: DecimalSource;
  /** Cost-scaling family (default `'exponential'`). */
  family?: CostScalingFamily;
}

/**
 * Build the cost curve for one purchasable as a Formula in level `n`.
 *
 * @param level - Level input — a plain level for a one-shot sample, or a
 *   reactive ref to track live game state.
 * @param params - Authored `baseCost` / `costMultiplier` / `family`.
 * @returns An invertible, integrable Formula evaluating to `Cost(level)`.
 *
 * @example
 * ```ts
 * // Beat time: cost of the next purchase over own-income production.
 * const curve = costCurve(producer.count.value, { baseCost: 15, costMultiplier: 1.15 });
 * const beatSeconds = curve.div(perUnitRate * quantity).evaluate();
 *
 * // Same curve, inverted: how many levels does the current wallet afford?
 * const affordable = calculateMaxAffordable(curve, coins);
 * ```
 */
export function costCurve(
  level: DecimalSource | Ref<DecimalSource>,
  { baseCost, costMultiplier, family = 'exponential' }: CostCurveParams,
): GenericFormula {
  switch (family) {
    case 'linear':
      // `base + coef·n` with `coef = baseCost·(multiplier − 1)` is the same
      // curve as `baseCost·(1 + (multiplier − 1)·n)`, expressed in the shape
      // Formula.linear takes.
      return Formula.linear(level, baseCost, Decimal.mul(baseCost, Decimal.sub(costMultiplier, 1)));
    case 'polynomial':
      return Formula.polynomial(level, baseCost, costMultiplier);
    case 'exponential':
      return Formula.exponential(level, baseCost, costMultiplier);
  }
}

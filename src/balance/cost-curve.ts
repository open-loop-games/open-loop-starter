/**
 * Cost-curve constructors — the three canonical cost-scaling families as
 * engine `Formula` chains in purchase count `n`.
 *
 * Balance tooling wants the *curve*, not one sample off it. A Formula
 * inverts (`calculateMaxAffordable`, `tryInvert`, `firstPassage`), integrates
 * (`calculateCost` for cumulative spend), and divides by a production rate to
 * give beat time — `curve.div(rate)` — so nothing downstream has to re-derive
 * `Cost(n)` by hand to get at the numerator.
 *
 * `costScaling` is one balance constant read three ways:
 *
 * - `exponential` — `baseCost · costScaling^n`, where `costScaling` is the cost ratio. The genre default
 *   (Cookie Clicker's 1.15).
 * - `linear` — `baseCost · (1 + (costScaling − 1) · n)`: the constant read as
 *   a per-purchase fraction of base rather than a ratio.
 * - `polynomial` — `baseCost · n^costScaling`: the constant read as the
 *   exponent.
 */

import {
  Decimal,
  Formula,
  type DecimalSource,
  type GenericFormula,
  type Ref,
} from '@open-loop/engine';

/** Cost-scaling family — how `Cost(n)` grows with the purchase count. */
export type CostScalingFamily = 'exponential' | 'linear' | 'polynomial';

/** Authored cost-scaling parameters, as they appear in archetype `data/`. */
export interface CostCurveParams {
  /** Cost of the first purchase, at purchase count 0. */
  baseCost: DecimalSource;
  /** Read per `family`; see the module header. */
  costScaling: DecimalSource;
  /** Cost-scaling family (default `'exponential'`). */
  family?: CostScalingFamily;
}

/**
 * Build the cost curve for one purchasable as a Formula in purchase count `n`.
 *
 * @param purchaseCount - A plain count for a one-shot sample, or a reactive
 *   ref to track live game state.
 * @param params - Authored `baseCost` / `costScaling` / `family`.
 * @returns An invertible, integrable Formula evaluating to `Cost(purchaseCount)`.
 *
 * @example
 * ```ts
 * // Beat time: cost of the next purchase over its own production rate.
 * const curve = costCurve(producer.count.value, { baseCost: 15, costScaling: 1.15 });
 * const beatTime = curve.div(perUnitRate * quantity).evaluate();
 *
 * // Same curve, inverted: how many purchases does the current amount afford?
 * const affordable = calculateMaxAffordable(curve, coins);
 * ```
 */
export function costCurve(
  purchaseCount: DecimalSource | Ref<DecimalSource>,
  { baseCost, costScaling, family = 'exponential' }: CostCurveParams,
): GenericFormula {
  switch (family) {
    case 'linear':
      // `base + coef·n` with `coef = baseCost·(costScaling − 1)` is the same
      // curve as `baseCost·(1 + (costScaling − 1)·n)`, expressed in the shape
      // Formula.linear takes.
      return Formula.linear(
        purchaseCount,
        baseCost,
        Decimal.mul(baseCost, Decimal.sub(costScaling, 1)),
      );
    case 'polynomial':
      return Formula.polynomial(purchaseCount, baseCost, costScaling);
    case 'exponential':
      return Formula.exponential(purchaseCount, baseCost, costScaling);
  }
}

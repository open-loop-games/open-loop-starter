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
 * Each family takes its own constant:
 *
 * - `exponential` — `baseCost · costRatio^n`. The genre default
 *   (Cookie Clicker's 1.15).
 * - `linear` — `baseCost + coef · n`: each purchase adds `coef`.
 * - `polynomial` — `baseCost · n^exponent`.
 */

import { Formula, type DecimalSource, type GenericFormula, type Ref } from '@open-loop/engine';

/** Authored cost-scaling parameters, as they appear in archetype `data/`. */
export type CostCurveParams = {
  /** Cost of the first purchase, at purchase count 0. */
  baseCost: DecimalSource;
} & (
  | { family?: 'exponential'; costRatio: DecimalSource }
  | { family: 'linear'; coef: DecimalSource }
  | { family: 'polynomial'; exponent: DecimalSource }
);

/** Cost-scaling family — how `Cost(n)` grows with the purchase count. */
export type CostScalingFamily = NonNullable<CostCurveParams['family']>;

/**
 * Build the cost curve for one purchasable as a Formula in purchase count `n`.
 *
 * @param purchaseCount - A plain count for a one-shot sample, or a reactive
 *   ref to track live game state.
 * @param params - Authored `baseCost`, `family` and that family's constant.
 * @returns An invertible, integrable Formula evaluating to `Cost(purchaseCount)`.
 *
 * @example
 * ```ts
 * // Beat time: cost of the next purchase over its own production rate.
 * const curve = costCurve(producer.count.value, { baseCost: 15, costRatio: 1.15 });
 * const beatTime = curve.div(perUnitRate * quantity).evaluate();
 *
 * // Same curve, inverted: how many purchases does the current amount afford?
 * const affordable = calculateMaxAffordable(curve, coins);
 * ```
 */
export function costCurve(
  purchaseCount: DecimalSource | Ref<DecimalSource>,
  params: CostCurveParams,
): GenericFormula {
  switch (params.family) {
    case 'linear':
      return Formula.linear(purchaseCount, params.baseCost, params.coef);
    case 'polynomial':
      return Formula.polynomial(purchaseCount, params.baseCost, params.exponent);
    case 'exponential':
    case undefined:
      return Formula.exponential(purchaseCount, params.baseCost, params.costRatio);
  }
}

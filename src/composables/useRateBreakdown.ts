import { computed } from 'vue';
import {
  Decimal,
  type ComputedRef,
  type DecimalSource,
  type ModifierChain,
} from 'open-loop-engine';

export interface RateBreakdownRow {
  def: { name: string; baseRate: DecimalSource };
  rate: ComputedRef<DecimalSource>;
  rateChain: ModifierChain;
  count: ComputedRef<DecimalSource>;
  beatSeconds: ComputedRef<number>;
}

export interface RateBreakdownView {
  contribution: ComputedRef<Decimal>;
  contributionPct: ComputedRef<number>;
  beatFinite: ComputedRef<boolean>;
  marginalDelta: ComputedRef<Decimal>;
  marginalPct: ComputedRef<number>;
  pendingPositive: ComputedRef<boolean>;
}

/**
 * Tooltip-side compute kit shared by every per-producer hover surface.
 * Producer's bakery-themed tooltip and the default RateBreakdownTooltip both
 * use this — keeps contribution / beat / marginal math in one spot so a fix
 * in one place lands everywhere.
 *
 * `pendingAmount` defaults to 1 so the marginal projection is always
 * meaningful for "next purchase"-style callers; pass a bulk-aware getter
 * (e.g. `() => row.maxAffordable.value`) when bulk-buy mode is active.
 */
export function useRateBreakdown(
  row: RateBreakdownRow,
  totalRate: () => DecimalSource,
  pendingAmount: () => DecimalSource = () => 1,
): RateBreakdownView {
  const contribution = computed(() => Decimal.mul(row.rate.value, row.count.value));

  const contributionPct = computed(() => {
    const total = Decimal.fromValue(totalRate());
    if (!total.gt(0)) return 0;
    return contribution.value.div(total).toNumber();
  });

  const beatFinite = computed(() => Number.isFinite(row.beatSeconds.value));

  const marginalDelta = computed(() => Decimal.mul(row.rate.value, pendingAmount()));

  const marginalPct = computed(() => {
    const total = Decimal.fromValue(totalRate());
    if (!total.gt(0)) return 0;
    return marginalDelta.value.div(total).toNumber();
  });

  const pendingPositive = computed(() => Decimal.gt(pendingAmount(), 0));

  return { contribution, contributionPct, beatFinite, marginalDelta, marginalPct, pendingPositive };
}

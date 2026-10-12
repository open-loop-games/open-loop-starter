import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type ModifierChain } from '@open-loop/engine';

export interface RateBreakdownRow {
  def: { displayName: string; baseRate: DecimalSource };
  rate: ComputedRef<DecimalSource>;
  rateChain: ModifierChain;
  count: ComputedRef<DecimalSource>;
  beatTime: ComputedRef<number>;
}

export interface RateBreakdownView {
  productionRate: ComputedRef<Decimal>;
  productionShare: ComputedRef<number>;
  beatTimeFinite: ComputedRef<boolean>;
  marginalDelta: ComputedRef<Decimal>;
  marginalPct: ComputedRef<number>;
  pendingPositive: ComputedRef<boolean>;
}

/**
 * Tooltip-side compute kit shared by every per-producer hover surface.
 * Producer's bakery-themed tooltip and the default RateBreakdownTooltip both
 * use this — keeps productionRate / beat time / marginal math in one spot so a fix
 * in one place lands everywhere.
 *
 * `pendingCount` defaults to 1 so the marginal projection is always
 * meaningful for "next purchase"-style callers; pass a bulk-aware getter
 * (e.g. `() => row.maxAffordable.value`) when bulk-buy mode is active.
 */
export function useRateBreakdown(
  row: RateBreakdownRow,
  totalRate: () => DecimalSource,
  pendingCount: () => DecimalSource = () => 1,
): RateBreakdownView {
  const productionRate = computed(() => Decimal.mul(row.rate.value, row.count.value));

  const productionShare = computed(() => {
    const total = Decimal.fromValue(totalRate());
    if (!total.gt(0)) return 0;
    return productionRate.value.div(total).toNumber();
  });

  const beatTimeFinite = computed(() => Number.isFinite(row.beatTime.value));

  const marginalDelta = computed(() => Decimal.mul(row.rate.value, pendingCount()));

  const marginalPct = computed(() => {
    const total = Decimal.fromValue(totalRate());
    if (!total.gt(0)) return 0;
    return marginalDelta.value.div(total).toNumber();
  });

  const pendingPositive = computed(() => Decimal.gt(pendingCount(), 0));

  return {
    productionRate,
    productionShare,
    beatTimeFinite,
    marginalDelta,
    marginalPct,
    pendingPositive,
  };
}

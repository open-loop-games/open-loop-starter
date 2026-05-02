import { computed, type ComputedRef } from 'vue';
import { Decimal, type Conversion, type DecimalSource, type InjectionKey } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';

export interface TierResetApi {
  /** Conversion gain available right now. Display as `+ N <currency>`. */
  currentGain: ComputedRef<DecimalSource>;
  /** Base-resource amount needed to gain one more unit of the prestige currency. */
  nextAt: ComputedRef<DecimalSource>;
  /** Base-resource amount needed for the current gain level. */
  currentAt: ComputedRef<DecimalSource>;
  /** True when the conversion would yield at least its `minimumGain` (default 1). */
  canConvert: ComputedRef<boolean>;
  /**
   * 0..1 fraction for the embedded `ProgressBar` on the tier-header reset
   * button. Below first gain: `baseAmount / nextAt`. At or above first gain:
   * 1 (over-ready). Log-space scaling deferred to the balance leaf — the
   * pre-first-gain shape is the most player-relevant indicator.
   */
  progressFraction: ComputedRef<number>;
  /** Performs the conversion: applies gain, fires the bound reset, returns gained amount. */
  perform: () => DecimalSource;
}

/**
 * Wrap a tier's `Conversion` for UI consumption. The conversion already
 * binds the matching `Reset` (per scaler/prestige.connect + scaler/transcend.connect)
 * so calling `convert()` cascades through the reset scope correctly.
 *
 * Antimatter has no UI reset button — its reset cascades from Prestige —
 * so this helper is only used for Prestige + Transcend tiers.
 */
export function useTierReset(conversionKey: InjectionKey<Conversion>): TierResetApi {
  const conversion = useModule(conversionKey);

  const currentGain = computed(() => conversion.actualGain.value);
  const nextAt = computed(() => conversion.nextAt.value);
  const currentAt = computed(() => conversion.currentAt.value);
  const canConvert = computed(() => conversion.canConvert.value);

  const progressFraction = computed(() => {
    const ready = canConvert.value;
    if (ready) return 1;
    const base = Decimal.fromValue(conversion.baseResource.value);
    const target = Decimal.fromValue(nextAt.value);
    if (!target.gt(0)) return 0;
    const ratio = base.div(target).toNumber();
    if (!Number.isFinite(ratio)) return 0;
    return Math.min(1, Math.max(0, ratio));
  });

  return {
    currentGain,
    nextAt,
    currentAt,
    canConvert,
    progressFraction,
    perform: () => conversion.convert(),
  };
}

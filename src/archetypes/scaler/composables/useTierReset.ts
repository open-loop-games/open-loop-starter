import { computed, type ComputedRef } from 'vue';
import { Decimal, type Conversion, type DecimalSource, type InjectionKey } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';

export interface TierResetApi {
  /** Conversion gain available right now. Display as `+ N <currency>`. */
  currentGain: ComputedRef<DecimalSource>;
  /**
   * True when the conversion would yield ≥ 1 unit. Per OL-834 the new
   * `Conversion` API's `canConvert` only checks the cost requirement (which
   * is consume-all here, so always true at any positive base), so prestige
   * UI gates on `currentGain >= 1` instead.
   */
  canConvert: ComputedRef<boolean>;
  /** Performs the conversion: applies gain, fires the bound reset. */
  perform: () => void;
}

/**
 * Wrap a tier's `Conversion` for UI consumption. The conversion's
 * `afterConvert` hook fires the matching `Reset` (per
 * scaler/prestige.connect + scaler/transcend.connect).
 *
 * Antimatter has no UI reset button — its reset cascades from Prestige —
 * so this helper is only used for Prestige + Transcend tiers.
 *
 * Both prestige + transcend conversions have a single output; we read the
 * first/only entry from `currentGain`'s `Record<string, Decimal>`.
 */
export function useTierReset(conversionKey: InjectionKey<Conversion>): TierResetApi {
  const conversion = useModule(conversionKey);

  const currentGain = computed<DecimalSource>(() => {
    const gains = Object.values(conversion.currentGain.value);
    return gains.length > 0 ? gains[0] : Decimal.dZero;
  });
  const canConvert = computed(() => Decimal.gte(currentGain.value, 1));

  return {
    currentGain,
    canConvert,
    perform: () => {
      conversion.convert();
    },
  };
}

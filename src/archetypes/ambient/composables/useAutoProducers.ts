import { computed } from 'vue';
import {
  Decimal,
  type ComputedRef,
  type DecimalSource,
  type ModifierChain,
  type Purchasable,
} from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { AutoProducerDef } from '../data/types';
import { AutoProducersKey } from '../modules';

export interface AutoProducerRow {
  def: AutoProducerDef;
  rate: ComputedRef<DecimalSource>;
  rateChain: ModifierChain;
  count: ComputedRef<DecimalSource>;
  /** Single-unit beat: how long this producer alone would take to self-pay one more. */
  beatSeconds: ComputedRef<number>;
  /** Max units the player can currently afford. */
  maxAffordable: ComputedRef<DecimalSource>;
  getCost: (amount: DecimalSource) => DecimalSource;
  canAfford: (amount: DecimalSource) => boolean;
  purchase: (amount?: DecimalSource) => void;
  purchaseMax: () => void;
  purchasable?: Purchasable;
}

/**
 * Reactive rows for every auto-producer. Ambient is zero-click, so every
 * registered producer is `trigger: 'continuous'` and there is no manual entry
 * to filter out.
 */
export function useAutoProducers(): ComputedRef<AutoProducerRow[]> {
  const buildings = useModule(AutoProducersKey);

  return computed(() => {
    const rows: AutoProducerRow[] = [];
    for (const entry of buildings.getAll()) {
      const producer = entry.producer;
      const repeatable = producer.repeatable;
      const maxAffordable = computed(() => repeatable?.amountToPurchase.value ?? Decimal.dZero);
      rows.push({
        def: entry.def,
        rate: producer.computedRate,
        rateChain: producer.rateChain,
        count: producer.count,
        beatSeconds: computed(() => producer.purchaseBeatSeconds.value),
        maxAffordable,
        getCost: (amount) => repeatable?.getCost(amount) ?? Decimal.dInf,
        canAfford: (amount) => Decimal.gte(maxAffordable.value, amount),
        purchase: (amount) => {
          repeatable?.purchase(amount ?? 1);
        },
        purchaseMax: () => {
          repeatable?.purchaseMax();
        },
        purchasable: repeatable,
      });
    }
    return rows;
  });
}

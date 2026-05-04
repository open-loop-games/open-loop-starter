import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type ModifierChain,
  type ProducerCategory,
  type Purchasable,
} from 'open-loop-engine';
import type { ProducerDef } from '../data/types';

// TODO(expansion): near-identical to producer/composables/useProducers.ts;
// the only difference is the inject-key parameter. Graduate to
// src/composables/ when a third archetype lands its own copy.

export interface ProducerRow {
  def: ProducerDef;
  rate: ComputedRef<DecimalSource>;
  rateChain: ModifierChain;
  count: ComputedRef<DecimalSource>;
  /** Self-pay-one beat, ROI metric for tooltips. */
  beatSeconds: ComputedRef<number>;
  /** Max units the player can currently afford. */
  maxAffordable: ComputedRef<DecimalSource>;
  /** Cost for an arbitrary purchase amount (respects scaling). */
  getCost: (amount: DecimalSource) => DecimalSource;
  canAfford: (amount: DecimalSource) => boolean;
  purchase: (amount?: DecimalSource) => void;
  purchaseMax: () => void;
  purchasable?: Purchasable;
}

/**
 * Reactive rows for every continuous producer in the given category.
 * Mode-agnostic: callers pick how many to buy via `getCost(n)` /
 * `canAfford(n)`, or call `purchaseMax()` for the full affordable amount.
 *
 * Takes the category instance directly rather than an InjectionKey —
 * scaler tier APIs expose categories as fields on the bundle.
 */
export function useProducers(category: ProducerCategory<ProducerDef>): ComputedRef<ProducerRow[]> {
  return computed(() => {
    const rows: ProducerRow[] = [];
    for (const entry of category.getAll()) {
      // Scaler producers are continuous by construction (set in modules' mapProducer);
      // no trigger filter needed unlike producer archetype's mixed click+continuous shape.
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

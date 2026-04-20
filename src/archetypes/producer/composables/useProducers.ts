import { computed, inject, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type Engine, type Purchasable } from 'open-loop-engine';
import type { ProducerDef } from '../data/types';
import { BuildingsKey } from '../modules';

export interface ProducerRow {
  def: ProducerDef;
  rate: ComputedRef<DecimalSource>;
  count: ComputedRef<DecimalSource>;
  cost: ComputedRef<DecimalSource>;
  canPurchase: ComputedRef<boolean>;
  beatSeconds: ComputedRef<number>;
  purchase: (amount?: DecimalSource) => void;
  purchasable?: Purchasable;
}

/**
 * Reactive rows for every continuous producer (excluding the manual click).
 * Consumers render the producer panel straight from this list.
 */
export function useProducers(): ComputedRef<ProducerRow[]> {
  const engine = inject<Engine>('engine');
  const buildings = engine?.tryInject(BuildingsKey);
  if (!buildings) {
    throw new Error('useProducers() called outside an active producer engine');
  }

  return computed(() => {
    const rows: ProducerRow[] = [];
    for (const entry of buildings.getAll()) {
      if (entry.def.trigger !== 'continuous') continue;
      const producer = entry.producer;
      const repeatable = producer.repeatable;
      rows.push({
        def: entry.def,
        rate: producer.computedRate as unknown as ComputedRef<DecimalSource>,
        count: producer.count as unknown as ComputedRef<DecimalSource>,
        cost: computed(() => repeatable?.getCost(1) ?? Decimal.dInf),
        canPurchase: computed(() => repeatable?.canPurchase.value ?? false),
        beatSeconds: computed(() => producer.purchaseBeatSeconds.value),
        purchase: (amount) => {
          repeatable?.purchase(amount ?? 1);
        },
        purchasable: repeatable,
      });
    }
    return rows;
  });
}

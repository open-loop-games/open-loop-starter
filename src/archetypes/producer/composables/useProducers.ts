import { computed, inject, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type Engine,
  type ModifierChain,
  type Purchasable,
} from 'open-loop-engine';
import type { ProducerDef } from '../data/types';
import { BuildingsKey } from '../modules';

export interface ProducerRow {
  def: ProducerDef;
  rate: ComputedRef<DecimalSource>;
  rateChain: ModifierChain;
  count: ComputedRef<DecimalSource>;
  /** Single-unit beat: how long this producer alone would take to self-pay one more. ROI metric, tooltip-side. */
  beatSeconds: ComputedRef<number>;
  /** Max units the player can currently afford. */
  maxAffordable: ComputedRef<DecimalSource>;
  /** Cost for an arbitrary purchase amount (respects scaling). */
  getCost: (amount: DecimalSource) => DecimalSource;
  /** Affordability probe for an arbitrary amount — mode-aware buttons key off this. */
  canAfford: (amount: DecimalSource) => boolean;
  purchase: (amount?: DecimalSource) => void;
  purchaseMax: () => void;
  purchasable?: Purchasable;
}

/**
 * Reactive rows for every continuous producer (excluding the manual click).
 * Mode-agnostic: callers pick how many to buy via `getCost(n)` / `canAfford(n)`,
 * or call `purchaseMax()` for the full affordable amount.
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
      const maxAffordable = computed(() => repeatable?.amountToPurchase.value ?? Decimal.dZero);
      rows.push({
        def: entry.def,
        rate: producer.computedRate as unknown as ComputedRef<DecimalSource>,
        rateChain: producer.rateChain,
        count: producer.count as unknown as ComputedRef<DecimalSource>,
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

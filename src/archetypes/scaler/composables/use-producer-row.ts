import { computed, ref, type Ref } from 'vue';
import { Decimal, type DecimalSource, type Producer, type Purchasable } from 'open-loop-engine';
import type { ProducerRowData, UpgradeCellData } from '@/ui/compositions';

/**
 * Adapt an engine Producer (and its def) into the abstract ProducerRowData
 * shape the cross-archetype ProducerList composition consumes. Scaler's
 * canonical-fidelity port preserves single-buy semantics (maxAffordable=1,
 * bulkModeSource='none' at the panel), so we don't surface engine bulk math
 * here — the next leaf that wants bulk on scaler can lift it then.
 */
export function toProducerRowData(producer: Producer, id: string, name: string): ProducerRowData {
  const repeatable = producer.repeatable;
  const totalRate = computed(() => Decimal.mul(producer.computedRate.value, producer.count.value));
  return {
    id,
    name,
    count: producer.ownedCount,
    displayRate: totalRate,
    cost: (amount: DecimalSource) => repeatable?.getCost(amount) ?? Decimal.dZero,
    canBuy: () => repeatable?.canPurchase.value ?? false,
    maxAffordable: ref<DecimalSource>(1),
    buy: (amount: DecimalSource) => {
      repeatable?.purchase(amount);
    },
  };
}

/**
 * Adapt an engine Purchasable into the UpgradeCellData shape. Description is
 * passed through verbatim; position drives display ordering inside the grid.
 */
export function toUpgradeCellData(
  purchasable: Purchasable,
  id: string,
  name: string,
  description: string,
  costLabel: string,
  position: number,
): UpgradeCellData {
  const cost = computed(() => purchasable.getCost(1));
  return {
    id,
    name,
    description,
    cost,
    costLabel,
    canBuy: purchasable.canPurchase,
    owned: purchasable.active,
    buy: () => {
      if (!purchasable.active.value) purchasable.purchase();
    },
    position,
  };
}

/**
 * Construct a hidden-ref proxy: returns `true` when `gate` evaluates falsy.
 * Used by readout adapters so visibility is reactive without per-readout
 * computed plumbing at the call site.
 */
export function hiddenWhen(gate: () => boolean): Ref<boolean> {
  return computed(() => !gate()) as Ref<boolean>;
}

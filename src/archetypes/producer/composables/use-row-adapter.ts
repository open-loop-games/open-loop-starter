import { computed, ref } from 'vue';
import { type DecimalSource } from '@open-loop/engine';
import type { ProducerRow } from './useProducers';
import type { UpgradeRow } from './useUpgrades';
import type { ProducerRowData, UpgradeCellData } from '@/ui/compositions';

/**
 * Adapt the producer-archetype ProducerRow (rich; carries beatSeconds,
 * rateChain, def, etc. for the tooltip) to the structurally-thinner
 * ProducerRowData the cross-archetype ProducerList consumes. The rich row
 * is attached as `extra` so the `#row` slot can reach it without a side
 * lookup.
 */
export function toProducerRowData(row: ProducerRow): ProducerRowData {
  return {
    id: row.def.id,
    name: row.def.name,
    count: row.count,
    displayRate: row.rate,
    cost: (amount: DecimalSource) => row.getCost(amount),
    canBuy: (amount: DecimalSource) => row.canAfford(amount),
    maxAffordable: row.maxAffordable,
    buy: (amount: DecimalSource) => {
      row.purchase(amount);
    },
    extra: row,
  };
}

export function toUpgradeCellData(row: UpgradeRow): UpgradeCellData {
  return {
    id: row.def.id,
    name: row.def.name,
    description: row.def.description,
    cost: computed(() => row.def.cost),
    costLabel: '',
    canBuy: row.canPurchase,
    owned: row.bought,
    buy: () => {
      if (!row.bought.value) row.purchase();
    },
    extra: row,
  };
}

/** Used when a section is empty but needs a stable empty list. */
export const EMPTY_CELLS = ref<UpgradeCellData[]>([]);

<!--
  ProducerList — panel-level composition over a list of producer-shaped rows
  (buildings, dimensions, businesses). Engine-bridged: adapts to any module
  exposing the ProducerRowData shape. Slots for content shape, props for
  behavior. Sourced from OL-919 vocabulary work.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, formatWhole, type DecimalSource } from '@open-loop/engine';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import Button from '@/ui/components/Button.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import type { ProducerRowData } from './ProducerList';

type BulkModeSource = 'global' | 'none';
type Density = 'row' | 'card';
type Reveal = 'inline' | 'tooltip';

const props = withDefaults(
  defineProps<{
    rows: ProducerRowData[];
    costLabel: string;
    bulkModeSource?: BulkModeSource;
    density?: Density;
    reveal?: Reveal;
    bulkLadder?: BulkMode[];
  }>(),
  {
    bulkModeSource: 'global',
    density: 'row',
    reveal: 'inline',
    bulkLadder: () => [1, 10, 100, 'max'],
  },
);

defineSlots<{
  header?: () => unknown;
  row?: (props: {
    row: ProducerRowData;
    pendingAmount: DecimalSource;
    pendingCost: DecimalSource;
    buyLabel: string;
    buy: () => void;
  }) => unknown;
}>();

const globalBulk = useBulkMode();

function resolveAmount(maxAffordable: DecimalSource): DecimalSource {
  if (props.bulkModeSource === 'none') return 1;
  return globalBulk.resolveAmount(maxAffordable);
}

const visibleRows = computed(() => props.rows.filter((r) => r.unlocked?.value ?? true));

function rowState(row: ProducerRowData) {
  const pendingAmount = resolveAmount(row.maxAffordable.value);
  const pendingCost = row.cost(pendingAmount);
  const buyLabel = `Buy ${formatWhole(pendingAmount)} — ${format(pendingCost, 0)} ${props.costLabel}`;
  const canBuy = row.canBuy(pendingAmount);
  const buy = () => {
    if (canBuy) row.buy(pendingAmount);
  };
  return { pendingAmount, pendingCost, buyLabel, canBuy, buy };
}
</script>

<template>
  <section
    class="producer-list"
    :data-density="density"
  >
    <header class="producer-list__header">
      <slot name="header">
        <BulkModeSelector
          v-if="bulkModeSource === 'global'"
          :ladder="bulkLadder"
        />
      </slot>
    </header>
    <ul class="producer-list__rows">
      <li
        v-for="row in visibleRows"
        :key="row.id"
        class="producer-list__row"
      >
        <template v-if="$slots.row">
          <slot
            name="row"
            :row="row"
            :pending-amount="rowState(row).pendingAmount"
            :pending-cost="rowState(row).pendingCost"
            :buy-label="rowState(row).buyLabel"
            :buy="rowState(row).buy"
          />
        </template>
        <template v-else>
          <div class="producer-list__row-body">
            <div class="producer-list__row-head">
              <strong class="producer-list__row-name">{{ row.name }}</strong>
              <span class="producer-list__row-owned">owned: {{ format(row.count.value, 0) }}</span>
              <span class="producer-list__row-rate">+{{ format(row.displayRate.value, 2) }}/s</span>
            </div>
            <Tooltip v-if="reveal === 'tooltip'">
              <Button
                :disabled="!rowState(row).canBuy"
                :data-testid="`buy-${row.id}`"
                @click="rowState(row).buy()"
              >
                {{ rowState(row).buyLabel }}
              </Button>
              <template #content>
                {{ row.name }} — {{ format(row.displayRate.value, 2) }}/s
              </template>
            </Tooltip>
            <Button
              v-else
              :disabled="!rowState(row).canBuy"
              :data-testid="`buy-${row.id}`"
              @click="rowState(row).buy()"
            >
              {{ rowState(row).buyLabel }}
            </Button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.producer-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.producer-list__header {
  display: flex;
  align-items: center;
  gap: var(--gap);
  justify-content: flex-end;
  min-height: 0;
}
.producer-list__header:empty {
  display: none;
}
.producer-list__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.producer-list[data-density='card'] .producer-list__rows {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap);
}
.producer-list__row-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.producer-list[data-density='card'] .producer-list__row-body {
  flex-direction: column;
  align-items: stretch;
}
.producer-list__row-head {
  display: flex;
  gap: var(--gap);
  align-items: baseline;
  flex-wrap: wrap;
}
.producer-list__row-name {
  min-width: 7em;
}
.producer-list__row-owned,
.producer-list__row-rate {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

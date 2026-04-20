<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import { useProducers, type ProducerRow } from '../../composables/useProducers';
import { useArc } from '../../composables/useArc';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import { useFormatting } from '@/composables/useFormatting';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import ProducerTooltip from '../components/ProducerTooltip.vue';

const rows = useProducers();
const arc = useArc();
const { perSecond: totalRate } = useHeadlineRate();
const { mode, resolveAmount } = useBulkMode();
const { format, formatWhole } = useFormatting();

const LADDER: BulkMode[] = [1, 10, 100, 'max'];

const topTierId = computed(() => rows.value[rows.value.length - 1]?.def.id ?? null);

function pendingAmount(row: ProducerRow): DecimalSource {
  return resolveAmount(row.maxAffordable.value);
}

function pendingCost(row: ProducerRow): DecimalSource {
  const amt = pendingAmount(row);
  return Decimal.gt(amt, 0) ? row.getCost(amt) : row.getCost(1);
}

function buyLabel(row: ProducerRow): string {
  const amt = Decimal.fromValue(pendingAmount(row));
  // Mode=1 collapses to "Buy"; higher modes always show the count the player
  // will actually receive — "up to N" fallback, never a dead ×N.
  if (mode.value === 1 || amt.lte(1)) return 'Buy';
  return `Buy ×${formatWhole(amt)}`;
}

function buy(row: ProducerRow): void {
  if (mode.value === 'max') {
    row.purchaseMax();
    return;
  }
  const amt = resolveAmount(row.maxAffordable.value);
  if (Decimal.gt(amt, 0)) row.purchase(amt);
}

function totalPerSecond(row: ProducerRow): DecimalSource {
  return Decimal.mul(row.rate.value, row.count.value);
}
</script>

<template>
  <div class="producer-panel">
    <header class="producer-panel__header">
      <h3 class="panel-title">
        Producers
      </h3>
      <BulkModeSelector :ladder="LADDER" />
    </header>
    <ul class="producer-list">
      <ProducerTooltip
        v-for="row in rows"
        :key="row.def.id"
        :row="row"
        :total-rate="totalRate"
        :pending-amount="pendingAmount(row)"
      >
        <li
          class="producer-row"
          :class="{
            'is-arc-closer': row.def.id === topTierId && arc.complete.value,
          }"
          :data-testid="`producer-${row.def.id}`"
        >
          <div class="producer-row__head">
            <span class="producer-name">{{ row.def.name }}</span>
            <span class="producer-count">{{ format(row.count.value, 0) }}</span>
          </div>
          <div class="producer-row__meta">
            <span>{{ format(row.rate.value, 1) }} /sec each</span>
            <span>total {{ format(totalPerSecond(row), 1) }} /sec</span>
          </div>
          <Button
            class="buy-button"
            :disabled="!row.canAfford(1)"
            :data-testid="`buy-${row.def.id}`"
            @click="buy(row)"
          >
            <span class="buy-label">{{ buyLabel(row) }}</span>
            <span class="buy-cost">{{ format(pendingCost(row), 0) }}</span>
          </Button>
        </li>
      </ProducerTooltip>
    </ul>
  </div>
</template>

<style scoped>
.producer-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}

.producer-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}

.producer-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.producer-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.producer-row.is-arc-closer {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-primary) inset;
}

.producer-row__head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.producer-row__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78em;
  color: var(--color-text-muted);
}

.buy-button {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap-sm);
  margin-top: 4px;
  width: 100%;
  padding: 6px 10px;
  font-size: 0.85em;
}

.buy-label {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.buy-cost {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<!--
  Per-tier producer list. Each row is name + count + rate + cost +
  buy-1 / buy-max buttons. Mode-agnostic: callers pick the bulk semantics
  via `getCost` / `purchase` / `purchaseMax` from `ProducerRow`.

  Each row is wrapped in ProducerTooltip — the modifier chain breakdown
  surfaces on hover, the same data that previously squatted in the sidebar.
-->
<script setup lang="ts">
import { Decimal } from 'open-loop-engine';
import { format, formatWhole } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';
import type { ProducerRow } from '../../composables/useProducers';
import ProducerTooltip from './ProducerTooltip.vue';

defineProps<{
  rows: ProducerRow[];
}>();

function buyOne(row: ProducerRow): void {
  if (!row.canAfford(1)) return;
  row.purchase(1);
}

function buyMax(row: ProducerRow): void {
  if (!Decimal.gt(row.maxAffordable.value, 0)) return;
  row.purchaseMax();
}
</script>

<template>
  <div class="scaler-producer-grid">
    <ProducerTooltip v-for="row in rows" :key="row.def.id" :row="row">
      <div class="scaler-producer-row" :data-affordable="row.canAfford(1)">
        <div class="scaler-producer-row__name">
          {{ row.def.name }}
          <span class="scaler-producer-row__count">×{{ formatWhole(row.count.value) }}</span>
        </div>
        <div class="scaler-producer-row__rate">{{ format(row.rate.value, 2) }}/s</div>
        <div class="scaler-producer-row__cost">Cost {{ format(row.getCost(1), 2) }}</div>
        <div class="scaler-producer-row__actions">
          <Button class="btn-sm" :disabled="!row.canAfford(1)" @click="buyOne(row)"> Buy 1 </Button>
          <Button
            class="btn-sm"
            :disabled="!Decimal.gt(row.maxAffordable.value, 0)"
            @click="buyMax(row)"
          >
            Buy Max ({{ formatWhole(row.maxAffordable.value) }})
          </Button>
        </div>
      </div>
    </ProducerTooltip>
    <p v-if="rows.length === 0" class="scaler-producer-grid__empty">
      No producers in this tier yet.
    </p>
  </div>
</template>

<style scoped>
.scaler-producer-grid {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
}
.scaler-producer-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
.scaler-producer-row[data-affordable='true'] {
  border-color: var(--color-primary);
}
.scaler-producer-row__name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 600;
}
.scaler-producer-row__count {
  color: var(--color-text-muted);
  font-weight: 400;
  font-size: 0.85em;
}
.scaler-producer-row__rate,
.scaler-producer-row__cost {
  color: var(--color-text-muted);
  font-size: 0.9em;
}
.scaler-producer-row__actions {
  display: flex;
  gap: 4px;
}
.scaler-producer-grid__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--gap);
}
</style>

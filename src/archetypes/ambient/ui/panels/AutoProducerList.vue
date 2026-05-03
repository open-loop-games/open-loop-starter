<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { useAutoProducers, type AutoProducerRow } from '../../composables/useAutoProducers';
import { UnlocksKey } from '../../modules';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useFormatting } from '@/composables/useFormatting';
import RateBreakdownTooltip from '@/ui/components/RateBreakdownTooltip.vue';

const rows = useAutoProducers();
const unlocks = useModule(UnlocksKey);
const { perSecond: totalRate } = useHeadlineRate();
const { format } = useFormatting();

// Producer → unlock-id lookup (each producer reveal in the unlock category).
const producerUnlockId = new Map<string, string>();
for (const entry of unlocks.getAll()) {
  if (entry.def.reveals.kind === 'producer') {
    producerUnlockId.set(entry.def.reveals.producerId, entry.def.id);
  }
}

function isVisible(row: AutoProducerRow): boolean {
  const unlockId = producerUnlockId.get(row.def.id);
  if (!unlockId) return true;
  return unlocks.getPurchasable(unlockId)?.active.value === true;
}

const visibleRows = computed(() => rows.value.filter(isVisible));

function buy(row: AutoProducerRow): void {
  if (Decimal.gt(row.maxAffordable.value, 0)) row.purchase(1);
}

function totalPerSecond(row: AutoProducerRow) {
  return Decimal.mul(row.rate.value, row.count.value);
}
</script>

<template>
  <section class="producer-list">
    <h3 class="panel-title">
      Garden
    </h3>
    <ul
      v-if="visibleRows.length"
      class="rows"
    >
      <RateBreakdownTooltip
        v-for="row in visibleRows"
        :key="row.def.id"
        :row="row"
        :total-rate="totalRate"
        breakdown-title="Rate each"
      >
        <li
          class="row"
          :data-testid="`producer-${row.def.id}`"
        >
          <div class="row-head">
            <span class="row-name">{{ row.def.name }}</span>
            <span class="row-count">{{ format(row.count.value, 0) }}</span>
          </div>
          <div class="row-meta">
            <span>{{ format(row.rate.value, 1) }} /sec each</span>
            <span>total {{ format(totalPerSecond(row), 1) }} /sec</span>
          </div>
          <Button
            class="buy-button"
            :disabled="!row.canAfford(1)"
            :data-testid="`buy-${row.def.id}`"
            @click="buy(row)"
          >
            <span class="buy-label">Buy</span>
            <span class="buy-cost">{{ format(row.getCost(1), 0) }}</span>
          </Button>
        </li>
      </RateBreakdownTooltip>
    </ul>
    <p
      v-else
      class="empty"
    >
      Tilling the earth…
    </p>
  </section>
</template>

<style scoped>
.producer-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0 0 var(--gap-sm);
}

.rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.row-head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.row-meta {
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
  padding: 6px 10px;
  font-size: 0.85em;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
}

.buy-button:disabled {
  cursor: default;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.buy-button:not(:disabled):hover {
  background: var(--color-surface-hover);
}

.buy-label {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.buy-cost {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.85em;
  font-style: italic;
}
</style>

<script setup lang="ts">
import { useProducers } from '../../composables/useProducers';
import { useFormatting } from '@/composables/useFormatting';

const rows = useProducers();
const { format, formatPurchaseBeat } = useFormatting();
</script>

<template>
  <div class="producer-panel">
    <h3 class="panel-title">
      Producers
    </h3>
    <ul class="producer-list">
      <li
        v-for="row in rows"
        :key="row.def.id"
        class="producer-row"
        :data-testid="`producer-${row.def.id}`"
      >
        <div class="producer-row__head">
          <span class="producer-name">{{ row.def.name }}</span>
          <span class="producer-count">{{ format(row.count.value, 0) }}</span>
        </div>
        <div class="producer-row__meta">
          <span>{{ format(row.rate.value, 1) }} /sec each</span>
          <span>{{ formatPurchaseBeat(row.beatSeconds.value) }}</span>
        </div>
        <button
          class="buy-button"
          :disabled="!row.canPurchase.value"
          :data-testid="`buy-${row.def.id}`"
          @click="row.purchase()"
        >
          Buy · {{ format(row.cost.value, 0) }}
        </button>
      </li>
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

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--gap-sm);
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
  margin-top: 4px;
  width: 100%;
  font-size: 0.85em;
}
</style>

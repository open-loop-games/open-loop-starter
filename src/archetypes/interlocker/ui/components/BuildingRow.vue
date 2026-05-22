<script setup lang="ts">
import { Decimal, format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import type { BuildingRow } from '../composables';

defineProps<{
  row: BuildingRow;
  bulkLabel: string;
}>();
</script>

<template>
  <li
    v-if="row.visible.value"
    class="building-row"
    :data-testid="`building-${row.id}`"
  >
    <div class="building-row__head">
      <strong class="building-row__name">{{ row.name }}</strong>
      <span class="building-row__count">{{ row.count.value }}</span>
    </div>
    <RichTooltip side="right">
      <Button
        :disabled="!row.canBuy.value"
        :data-testid="`buy-${row.id}`"
        class="building-row__buy"
        @click="row.buy(1)"
      >
        <span>Buy {{ bulkLabel }}</span>
        <span class="building-row__cost-summary">
          <span
            v-for="line in row.costs.value"
            :key="line.resource"
            :data-satisfied="line.satisfied.value"
          >{{ format(line.amount.value, 0) }} {{ line.resourceName }}</span>
        </span>
      </Button>
      <template #content>
        <div class="building-row__tooltip">
          <h4>{{ row.name }}</h4>
          <ul class="building-row__cost-list">
            <li
              v-for="line in row.costs.value"
              :key="line.resource"
              :data-satisfied="line.satisfied.value"
            >
              <span>{{ line.resourceName }}</span>
              <span>
                {{ format(line.amount.value, 0) }}
                <small>have {{ format(Decimal.fromValue(line.have.value), 0) }}</small>
              </span>
            </li>
          </ul>
          <ul
            v-if="row.grants.length"
            class="building-row__grant-list"
          >
            <li
              v-for="(grant, i) in row.grants"
              :key="i"
            >
              {{ grant.description }}
            </li>
          </ul>
        </div>
      </template>
    </RichTooltip>
  </li>
</template>

<style scoped>
.building-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  list-style: none;
}
.building-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap-sm);
}
.building-row__name {
  font-weight: 600;
}
.building-row__count {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
.building-row__buy {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  width: 100%;
  text-align: left;
}
.building-row__cost-summary {
  display: flex;
  gap: var(--gap-xs);
  flex-wrap: wrap;
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
.building-row__cost-summary > span[data-satisfied='false'] {
  color: var(--color-text);
  opacity: 0.55;
  text-decoration: line-through;
}
.building-row__tooltip {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  font-size: 0.85em;
}
.building-row__tooltip h4 {
  margin: 0;
}
.building-row__cost-list,
.building-row__grant-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.building-row__cost-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-variant-numeric: tabular-nums;
}
.building-row__cost-list li[data-satisfied='false'] {
  color: var(--color-text-muted);
}
.building-row__cost-list small {
  color: var(--color-text-muted);
  margin-left: 4px;
}
.building-row__grant-list {
  padding-top: var(--gap-xs);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
}
</style>

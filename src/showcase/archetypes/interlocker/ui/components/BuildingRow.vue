<script setup lang="ts">
import { Decimal, format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import type { BuildingRow } from '../composables';

defineProps<{
  row: BuildingRow;
  /** Resolved bulk count (×1/×10/×100) the click should purchase. */
  bulk: number;
}>();
</script>

<template>
  <li
    v-if="row.visible.value"
    class="building-row"
    :data-testid="`building-${row.id}`"
  >
    <RichTooltip side="right">
      <Button
        :disabled="!row.canBuy.value"
        :data-testid="`buy-${row.id}`"
        class="building-row__btn"
        @click="row.buy(bulk)"
      >
        <span class="building-row__name">{{ row.name }}</span>
        <span class="building-row__count">{{ row.count.value }}</span>
      </Button>
      <template #content>
        <div class="building-row__tooltip">
          <h4>{{ row.name }}</h4>
          <p
            v-if="row.continuous"
            class="building-row__note"
          >
            Continuous consumer — set how many run below.
          </p>
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
    <!-- Canon active-count throttle for continuous consumers (smelter): pause
         some of the running copies to cap the wood/mineral drain by hand. -->
    <div
      v-if="row.continuous && row.count.value > 0"
      class="building-row__active"
      :data-testid="`active-${row.id}`"
    >
      <span class="building-row__active-label">running</span>
      <Button
        :disabled="row.activeCount.value <= 0"
        class="building-row__active-step"
        :data-testid="`active-${row.id}-dec`"
        @click="row.setActive(row.activeCount.value - 1)"
      >
        −
      </Button>
      <span
        class="building-row__active-count"
        :data-testid="`active-${row.id}-count`"
      >
        {{ row.activeCount.value }} / {{ row.count.value }}
      </span>
      <Button
        :disabled="row.activeCount.value >= row.count.value"
        class="building-row__active-step"
        :data-testid="`active-${row.id}-inc`"
        @click="row.setActive(row.activeCount.value + 1)"
      >
        +
      </Button>
    </div>
  </li>
</template>

<style scoped>
.building-row {
  list-style: none;
}
/* Canon's building is a single full-width button: name on the left, owned
   count on the right; cost lives in the tooltip, affordability in the
   disabled state. */
.building-row__btn {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
  width: 100%;
  padding: var(--gap-xs) var(--gap-sm);
  text-align: left;
}
.building-row__name {
  font-weight: 600;
}
.building-row__count {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
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
.building-row__note {
  margin: 0;
  color: var(--color-text-muted);
  font-style: italic;
}
.building-row__active {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
  padding: 2px var(--gap-sm) var(--gap-xs);
}
.building-row__active-label {
  font-size: 0.72em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-right: auto;
}
.building-row__active-step {
  padding: 0 8px;
  line-height: 1.5;
}
.building-row__active-count {
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  min-width: 3.2em;
  text-align: center;
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

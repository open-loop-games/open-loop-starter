<script setup lang="ts">
import { Decimal, format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import type { CraftRow } from '../composables';

const props = defineProps<{
  row: CraftRow;
  /** Resolved bulk count (×1/×10/×100) the click should craft. */
  bulk: number;
}>();

// Fire up to `bulk` times, stopping as soon as inputs run short — the same
// "up to N" semantics the building buys and the Refine opener use.
function fire(): void {
  for (let i = 0; i < props.bulk; i++) {
    if (!props.row.canCraft.value) break;
    props.row.craft();
  }
}
</script>

<template>
  <li
    v-if="row.visible.value"
    class="craft-card"
    :data-testid="`craft-${row.id}`"
  >
    <RichTooltip side="top">
      <Button
        :disabled="!row.canCraft.value"
        :data-testid="`craft-${row.id}-fire`"
        class="craft-card__btn"
        @click="fire"
      >
        <span class="craft-card__name">{{ row.name }}</span>
        <span class="craft-card__output">→ {{ format(row.output.amount.value, 2) }} {{ row.output.resourceName }}</span>
      </Button>
      <template #content>
        <div class="craft-card__tooltip">
          <h4>{{ row.name }}</h4>
          <ul class="craft-card__cost-list">
            <li
              v-for="line in row.inputs"
              :key="line.resource"
              :data-satisfied="line.satisfied.value"
            >
              <span>{{ line.resourceName }}</span>
              <span>
                {{ format(line.amount, 0) }}
                <small>have {{ format(Decimal.fromValue(line.have.value), 0) }}</small>
              </span>
            </li>
          </ul>
          <p class="craft-card__yield">
            Yields {{ format(row.output.amount.value, 2) }} {{ row.output.resourceName }}
          </p>
        </div>
      </template>
    </RichTooltip>
  </li>
</template>

<style scoped>
.craft-card {
  list-style: none;
}
.craft-card__btn {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
  width: 100%;
  padding: var(--gap-xs) var(--gap-sm);
  text-align: left;
}
.craft-card__name {
  font-weight: 600;
}
.craft-card__output {
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
.craft-card__tooltip {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  font-size: 0.85em;
}
.craft-card__tooltip h4 {
  margin: 0;
}
.craft-card__cost-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.craft-card__cost-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-variant-numeric: tabular-nums;
}
.craft-card__cost-list li[data-satisfied='false'] {
  color: var(--color-text-muted);
}
.craft-card__cost-list small {
  color: var(--color-text-muted);
  margin-left: 4px;
}
.craft-card__yield {
  margin: 0;
  padding-top: var(--gap-xs);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
}
</style>

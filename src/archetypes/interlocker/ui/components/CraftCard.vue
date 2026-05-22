<script setup lang="ts">
import { Decimal, format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import type { CraftRow } from '../composables';

defineProps<{ row: CraftRow }>();
</script>

<template>
  <li
    v-if="row.visible.value"
    class="craft-card"
    :data-testid="`craft-${row.id}`"
  >
    <div class="craft-card__head">
      <strong>{{ row.name }}</strong>
      <span class="craft-card__output">
        → {{ format(row.output.amount.value, 2) }} {{ row.output.resourceName }}
      </span>
    </div>
    <ul class="craft-card__inputs">
      <li
        v-for="line in row.inputs"
        :key="line.resource"
        :data-satisfied="line.satisfied.value"
      >
        <span>{{ line.resourceName }}</span>
        <span class="craft-card__inputs-amount">
          {{ format(line.amount, 0) }}
          <small>have {{ format(Decimal.fromValue(line.have.value), 0) }}</small>
        </span>
      </li>
    </ul>
    <Button
      :disabled="!row.canCraft.value"
      :data-testid="`craft-${row.id}-fire`"
      class="craft-card__fire"
      @click="row.craft()"
    >
      Craft
    </Button>
  </li>
</template>

<style scoped>
.craft-card {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  list-style: none;
}
.craft-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap-sm);
}
.craft-card__output {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
}
.craft-card__inputs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85em;
}
.craft-card__inputs li {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-variant-numeric: tabular-nums;
}
.craft-card__inputs li[data-satisfied='false'] {
  color: var(--color-text-muted);
}
.craft-card__inputs-amount small {
  color: var(--color-text-muted);
  margin-left: 4px;
}
.craft-card__fire {
  align-self: flex-start;
}
</style>

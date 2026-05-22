<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import type { JobRow } from '../composables';

defineProps<{ row: JobRow }>();
</script>

<template>
  <li
    v-if="row.visible.value"
    class="job-row"
    :data-testid="`job-${row.id}`"
  >
    <div class="job-row__head">
      <strong>{{ row.name }}</strong>
      <span class="job-row__rate">{{ row.ratePerSecond.value.toFixed(2) }}/s</span>
    </div>
    <div class="job-row__allocator">
      <Button
        :disabled="!row.canDecrement.value"
        :data-testid="`job-${row.id}-dec`"
        @click="row.decrement()"
      >
        −
      </Button>
      <span
        class="job-row__count"
        :data-testid="`job-${row.id}-count`"
      >{{ row.count.value }}</span>
      <Button
        :disabled="!row.canIncrement.value"
        :data-testid="`job-${row.id}-inc`"
        @click="row.increment()"
      >
        +
      </Button>
    </div>
  </li>
</template>

<style scoped>
.job-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  list-style: none;
}
.job-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap-sm);
}
.job-row__rate {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.job-row__allocator {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  justify-content: space-between;
}
.job-row__count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 1.1em;
  min-width: 2em;
  text-align: center;
}
</style>

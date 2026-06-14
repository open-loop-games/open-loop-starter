<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import type { JobRow } from '../composables';

defineProps<{ row: JobRow }>();
</script>

<template>
  <li v-if="row.visible.value" class="job-row" :data-testid="`job-${row.id}`">
    <span class="job-row__name">{{ row.name }}</span>
    <span class="job-row__rate">{{ row.ratePerSecond.value.toFixed(2) }}/s</span>
    <div class="job-row__alloc">
      <Button
        :disabled="!row.canDecrement.value"
        :data-testid="`job-${row.id}-dec`"
        class="job-row__step"
        @click="row.decrement()"
      >
        −
      </Button>
      <span class="job-row__count" :data-testid="`job-${row.id}-count`">{{ row.count.value }}</span>
      <Button
        :disabled="!row.canIncrement.value"
        :data-testid="`job-${row.id}-inc`"
        class="job-row__step"
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
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-xs) 2px;
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}
.job-row__name {
  font-weight: 600;
  flex: 1 1 auto;
  min-width: 0;
}
.job-row__rate {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.job-row__alloc {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
}
.job-row__step {
  padding: 0 8px;
  line-height: 1.6;
}
.job-row__count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 1.75em;
  text-align: center;
}
</style>

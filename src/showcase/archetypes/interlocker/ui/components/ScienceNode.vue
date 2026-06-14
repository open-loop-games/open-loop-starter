<script setup lang="ts">
import { format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import type { ScienceRow } from '../composables';

defineProps<{ row: ScienceRow }>();
</script>

<template>
  <li
    v-if="row.visible.value"
    class="science-node"
    :data-testid="`science-${row.id}`"
    :data-state="row.researched.value ? 'researched' : 'available'"
  >
    <div class="science-node__info">
      <strong class="science-node__name">{{ row.name }}</strong>
      <span v-if="row.prerequisiteName && !row.researched.value" class="science-node__prereq">
        after {{ row.prerequisiteName }}
      </span>
    </div>
    <span v-if="row.researched.value" class="science-node__badge"> ✓ researched </span>
    <Button
      v-else
      :disabled="!row.canResearch.value"
      :data-testid="`science-${row.id}-research`"
      class="science-node__btn"
      @click="row.research()"
    >
      {{ format(row.cost, 0) }} science
    </Button>
  </li>
</template>

<style scoped>
.science-node {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: var(--gap-xs) 2px;
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}
.science-node__info {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  min-width: 0;
}
.science-node__name {
  font-weight: 600;
}
.science-node[data-state='researched'] .science-node__name {
  color: var(--color-text-muted);
  font-weight: 500;
}
.science-node__prereq {
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-style: italic;
}
.science-node__badge {
  font-size: 0.78em;
  font-weight: 600;
  color: var(--color-success);
  white-space: nowrap;
}
.science-node__btn {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>

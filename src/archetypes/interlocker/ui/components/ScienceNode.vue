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
    <div class="science-node__head">
      <strong>{{ row.name }}</strong>
      <span
        v-if="row.prerequisiteName"
        class="science-node__prereq"
      >
        after {{ row.prerequisiteName }}
      </span>
    </div>
    <div class="science-node__action">
      <span
        v-if="row.researched.value"
        class="science-node__badge"
      >Researched</span>
      <Button
        v-else
        :disabled="!row.canResearch.value"
        :data-testid="`science-${row.id}-research`"
        @click="row.research()"
      >
        {{ format(row.cost, 0) }} science
      </Button>
    </div>
  </li>
</template>

<style scoped>
.science-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  list-style: none;
}
.science-node[data-state='researched'] {
  border-color: var(--color-accent, var(--color-border));
  opacity: 0.85;
}
.science-node__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.science-node__prereq {
  font-size: 0.78em;
  color: var(--color-text-muted);
  font-style: italic;
}
.science-node__badge {
  font-weight: 600;
  color: var(--color-accent, var(--color-text));
  font-size: 0.85em;
}
</style>

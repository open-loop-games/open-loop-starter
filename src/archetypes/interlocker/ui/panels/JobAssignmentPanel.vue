<script setup lang="ts">
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { useJobs } from '../composables';
import JobAllocationRow from '../components/JobAllocationRow.vue';

const { rows, village } = useJobs();
</script>

<template>
  <PanelLayout :closable="false">
    <template #header>
      <h3 class="olui-panel__title">
        Jobs
      </h3>
      <span
        class="job-panel__summary"
        data-testid="job-summary"
      >
        {{ village.unassigned.value }} / {{ village.kittens.value }} unassigned
      </span>
    </template>
    <ul class="job-panel__list">
      <JobAllocationRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
      />
    </ul>
  </PanelLayout>
</template>

<style scoped>
.job-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
.job-panel__summary {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: 0.85em;
  margin-left: auto;
}
</style>

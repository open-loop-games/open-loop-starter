<script setup lang="ts">
import { computed } from 'vue';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import { useBuildings } from '../composables';
import BuildingRow from '../components/BuildingRow.vue';
import ActionBar from '../components/ActionBar.vue';

const { mode } = useBulkMode();
const LADDER: BulkMode[] = [1, 10, 100];

// The ladder is numeric-only (no 'max'), so the buy count is just the mode.
const bulkAmount = computed(() => (mode.value === 'max' ? 1 : mode.value));

// Buildings have multi-resource costs; ProducerList's ProducerRowData shape is
// single-resource (`cost(amount): DecimalSource`, `costLabel: string`), so the
// panel renders a bespoke <ul> of BuildingRow instead of slotting into
// ProducerList. The slot-override gymnastics to satisfy ProducerRowData would
// cost more than the wrapper saves. See OL-1060 triage discussion.
const rows = useBuildings(() => bulkAmount.value);
</script>

<template>
  <PanelLayout title="Buildings" :closable="false">
    <template #header>
      <h3 class="olui-panel__title">Buildings</h3>
      <BulkModeSelector :ladder="LADDER" />
    </template>
    <ActionBar />
    <ul class="buildings-panel__list">
      <BuildingRow v-for="row in rows" :key="row.id" :row="row" :bulk="bulkAmount" />
    </ul>
  </PanelLayout>
</template>

<style scoped>
/* Canon's Bonfire lays buildings out in compact columns, not a full-width
   stack — mirror that with a responsive grid that collapses to one column
   when the tab is narrow. */
.buildings-panel__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>

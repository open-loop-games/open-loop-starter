<script setup lang="ts">
import PanelLayout from '@/ui/components/PanelLayout.vue';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import { useBuildings } from '../composables';
import BuildingRow from '../components/BuildingRow.vue';

const { mode } = useBulkMode();
const LADDER: BulkMode[] = [1, 10, 100];

// Buildings have multi-resource costs; ProducerList's ProducerRowData shape is
// single-resource (`cost(amount): DecimalSource`, `costLabel: string`), so the
// panel renders a bespoke <ul> of BuildingRow instead of slotting into
// ProducerList. The slot-override gymnastics to satisfy ProducerRowData would
// cost more than the wrapper saves. See OL-1060 triage discussion.
const rows = useBuildings(() => (mode.value === 'max' ? 1 : mode.value));
const bulkLabel = () => (mode.value === 'max' ? '×1' : `×${mode.value}`);
</script>

<template>
  <PanelLayout
    title="Buildings"
    :closable="false"
  >
    <template #header>
      <h3 class="olui-panel__title">
        Buildings
      </h3>
      <BulkModeSelector :ladder="LADDER" />
    </template>
    <ul class="buildings-panel__list">
      <BuildingRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :bulk-label="bulkLabel()"
      />
    </ul>
  </PanelLayout>
</template>

<style scoped>
.buildings-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import { useCrafts } from '../composables';
import CraftCard from '../components/CraftCard.vue';

const { mode } = useBulkMode();
const LADDER: BulkMode[] = [1, 10, 100];
const bulkAmount = computed(() => (mode.value === 'max' ? 1 : mode.value));

const rows = useCrafts();
const visibleCount = computed(() => rows.filter((r) => r.visible.value).length);
</script>

<template>
  <PanelLayout title="Crafts" :closable="false">
    <template #header>
      <h3 class="olui-panel__title">Crafts</h3>
      <BulkModeSelector :ladder="LADDER" />
    </template>
    <p v-if="visibleCount === 0" class="crafts-panel__empty">Build a Workshop to unlock crafts.</p>
    <ul v-else class="crafts-panel__list">
      <CraftCard v-for="row in rows" :key="row.id" :row="row" :bulk="bulkAmount" />
    </ul>
  </PanelLayout>
</template>

<style scoped>
.crafts-panel__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
.crafts-panel__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>

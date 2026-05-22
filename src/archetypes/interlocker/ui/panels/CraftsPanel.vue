<script setup lang="ts">
import { computed } from 'vue';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { useCrafts } from '../composables';
import CraftCard from '../components/CraftCard.vue';

const rows = useCrafts();
const visibleCount = computed(() => rows.filter((r) => r.visible.value).length);
</script>

<template>
  <PanelLayout
    title="Crafts"
    :closable="false"
  >
    <p
      v-if="visibleCount === 0"
      class="crafts-panel__empty"
    >
      Build a Workshop to unlock crafts.
    </p>
    <ul
      v-else
      class="crafts-panel__list"
    >
      <CraftCard
        v-for="row in rows"
        :key="row.id"
        :row="row"
      />
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

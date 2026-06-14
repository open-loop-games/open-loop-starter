<script setup lang="ts">
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { useSciences } from '../composables';
import ScienceNode from '../components/ScienceNode.vue';

const rows = useSciences();
</script>

<template>
  <PanelLayout
    title="Sciences"
    :closable="false"
  >
    <ul class="science-panel__list">
      <ScienceNode
        v-for="row in rows"
        :key="row.id"
        :row="row"
      />
    </ul>
  </PanelLayout>
</template>

<style scoped>
.science-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>

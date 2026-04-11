<script setup lang="ts">
import { computed } from 'vue';
import ResourcesPanel from '@/ui/panels/ResourcesPanel.vue';
import ActionsPanel from '@/ui/panels/ActionsPanel.vue';
import ProducersPanel from '@/ui/panels/ProducersPanel.vue';
import UpgradesPanel from '@/ui/panels/UpgradesPanel.vue';
import AchievementsPanel from '@/ui/panels/AchievementsPanel.vue';
import LoopPanel from '@/ui/panels/LoopPanel.vue';
import { getSlot, hasSlot } from '@/modules/ui-registry';

const prestigePanel = computed(() => (hasSlot('prestige-panel') ? getSlot('prestige-panel') : null));
</script>

<template>
  <div class="vanilla-layout">
    <LoopPanel />
    <ResourcesPanel />
    <div class="grid">
      <ActionsPanel />
      <div class="side">
        <ProducersPanel />
        <UpgradesPanel />
        <component
          :is="prestigePanel"
          v-if="prestigePanel"
        />
      </div>
    </div>
    <AchievementsPanel />
  </div>
</template>

<style scoped>
.vanilla-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
.side {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

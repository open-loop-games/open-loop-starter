<script setup lang="ts">
import { computed } from 'vue';
import { ThreePanelShell } from '@/lib';
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
    <ThreePanelShell
      class="vanilla-body"
      left-width="280px"
      right-width="280px"
    >
      <template #left>
        <ActionsPanel />
      </template>
      <ProducersPanel />
      <template #right>
        <UpgradesPanel />
        <component
          :is="prestigePanel"
          v-if="prestigePanel"
        />
      </template>
    </ThreePanelShell>
    <AchievementsPanel />
  </div>
</template>

<style scoped>
.vanilla-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1;
}
.vanilla-body {
  flex: 1;
  min-height: 0;
}
</style>

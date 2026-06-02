<!--
  InterlockerGameView — the in-game shell: persistent resource column, the canon
  tab bar (Bonfire / Small Town / Science / Workshop), and the right-rail event
  log. Lives in its own component so it mounts only after a game starts, when
  the engine modules (getBuildings etc.) are installed.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { ThreePanelShell } from '@/lib';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import { getBuildings } from '../modules';
import { useLogFeed } from './composables';
import ResourceSidebar from './panels/ResourceSidebar.vue';
import BuildingsPanel from './panels/BuildingsPanel.vue';
import JobAssignmentPanel from './panels/JobAssignmentPanel.vue';
import CraftsPanel from './panels/CraftsPanel.vue';
import SciencePanel from './panels/SciencePanel.vue';
import LogPanel from './panels/LogPanel.vue';
import CalendarHeader from './components/CalendarHeader.vue';

const buildings = getBuildings();

// Stream colony events into the right-rail log for this session.
useLogFeed();

// Canon reveals tabs as their subsystem comes online: Science once a Library
// stands (the first science source), Workshop once the Workshop is built.
// Bonfire + Small Town are present from the start.
const tabs = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { value: 'bonfire', label: 'Bonfire' },
    { value: 'town', label: 'Small Town' },
  ];
  if (buildings.buildingCount('library') > 0) items.push({ value: 'science', label: 'Science' });
  if (buildings.buildingCount('workshop') > 0) items.push({ value: 'workshop', label: 'Workshop' });
  return items;
});
const activeTab = ref('bonfire');
</script>

<template>
  <ThreePanelShell
    left-width="220px"
    right-width="260px"
  >
    <template #left>
      <ResourceSidebar />
    </template>
    <Tabs
      v-model="activeTab"
      :items="tabs"
    >
      <template #panel-bonfire>
        <BuildingsPanel />
      </template>
      <template #panel-town>
        <JobAssignmentPanel />
      </template>
      <template #panel-science>
        <SciencePanel />
      </template>
      <template #panel-workshop>
        <CraftsPanel />
      </template>
    </Tabs>
    <template #right>
      <CalendarHeader />
      <LogPanel />
    </template>
  </ThreePanelShell>
</template>

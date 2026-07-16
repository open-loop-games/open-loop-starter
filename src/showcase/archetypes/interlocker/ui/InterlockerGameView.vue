<!--
  InterlockerGameView — the in-game view: the app frame + header, a persistent
  resource column, the canon tab bar (Bonfire / Small Town / Science / Workshop),
  and the right-rail event log. Interlocker's game-view boundary — it mounts
  under the root's post-start `v-else`, so the module getters (getBuildings etc.)
  resolve here. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { AppFrame, ThreePanelShell, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import { manifest } from '../manifest';
import { getBuildings, getAutomation } from '../modules';
import { useLogFeed } from './composables';
import ResourceSidebar from './panels/ResourceSidebar.vue';
import BuildingsPanel from './panels/BuildingsPanel.vue';
import JobAssignmentPanel from './panels/JobAssignmentPanel.vue';
import CraftsPanel from './panels/CraftsPanel.vue';
import SciencePanel from './panels/SciencePanel.vue';
import AutomationPanel from './panels/AutomationPanel.vue';
import LogPanel from './panels/LogPanel.vue';
import CalendarHeader from './components/CalendarHeader.vue';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();

const buildings = getBuildings();
const automation = getAutomation();

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
  // Automation reveals once its first tier unlocks (the first hut → Auto-Build).
  if (automation.isAutomated.value) items.push({ value: 'automation', label: 'Automation' });
  return items;
});
const activeTab = ref('bonfire');
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="emit('return')"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Interlocker — Kittens
          </h4>
          <p>
            Build catnip fields to feed your kittens, assign them to jobs to harvest wood, minerals,
            and science, then research up to architecture and craft your first megalith. The graph
            is wide and the pressure is the same Kittens players know — every kitten assigned away
            from farming trades against the catnip rate that keeps the colony alive.
          </p>
        </template>
      </SystemHeader>
    </template>
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
        <template #panel-automation>
          <AutomationPanel />
        </template>
      </Tabs>
      <template #right>
        <CalendarHeader />
        <LogPanel />
      </template>
    </ThreePanelShell>
  </AppFrame>
</template>

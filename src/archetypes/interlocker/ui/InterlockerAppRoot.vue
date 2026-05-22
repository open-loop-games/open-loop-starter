<script setup lang="ts">
import { inject, ref } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { AppFrame, DevPanelOverlay, SidebarMainShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import ResourceSidebar from './panels/ResourceSidebar.vue';
import BuildingsPanel from './panels/BuildingsPanel.vue';
import JobAssignmentPanel from './panels/JobAssignmentPanel.vue';
import CraftsPanel from './panels/CraftsPanel.vue';
import SciencePanel from './panels/SciencePanel.vue';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const stack = useModalStack();

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  engine.load();
  currentScreen.value = Screen.Game;
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  currentScreen.value = Screen.Slots;
}

function getActiveModules(): EngineModule[] {
  const activeId = engine.activeModId;
  if (!activeId) return [];
  return engine.mods.find((m) => m.id === activeId)?.modules ?? [];
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <AppFrame
    v-else
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="returnToSlots"
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
    <SidebarMainShell sidebar-width="220px">
      <template #sidebarResources>
        <ResourceSidebar />
      </template>
      <template #sidebar>
        <JobAssignmentPanel />
        <SciencePanel />
      </template>
      <BuildingsPanel />
      <CraftsPanel />
    </SidebarMainShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics
    v-if="isDev"
    v-model:workbench-open="showDevPanel"
  />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench
      :engine="engine"
      :modules="getActiveModules"
    />
  </DevPanelOverlay>
</template>

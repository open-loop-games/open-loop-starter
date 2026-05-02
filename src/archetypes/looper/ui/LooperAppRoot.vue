<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, ThreePanelShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import TownColumn from './components/TownColumn.vue';
import ActionColumn from './components/ActionColumn.vue';
import HeaderBand from './components/HeaderBand.vue';
import StatsPanel from './components/StatsPanel.vue';
import './looper-theme.css';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

function onKey(e: KeyboardEvent): void {
  if (!isDev) return;
  if (e.key === 'F12') {
    e.preventDefault();
    showDevPanel.value = !showDevPanel.value;
  }
}

onMounted(() => {
  document.body.dataset.archetype = 'looper';
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
  window.removeEventListener('keydown', onKey);
});

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
            Looper — Classic Adventuring
          </h4>
          <p>
            Queue up actions, watch your mana drain, and feel the difference next loop. Skills
            carry; the road remembers; you do too.
          </p>
        </template>
      </SystemHeader>
    </template>
    <ThreePanelShell
      left-width="240px"
      right-width="480px"
    >
      <template #left>
        <StatsPanel />
      </template>
      <TownColumn />
      <template #right>
        <div class="looper-main">
          <HeaderBand />
          <ActionColumn />
        </div>
      </template>
    </ThreePanelShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics v-if="isDev" />
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

<style scoped>
.looper-main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}
</style>

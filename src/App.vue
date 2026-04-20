<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from 'vue';
import { createEngine } from 'open-loop-engine';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { sharedBase } from '@/modules';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import GameScreen from '@/ui/screens/GameScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';

const currentScreen = ref<Screen>(Screen.Slots);
const isDev = import.meta.env.DEV;

// Phase 1 placeholder: engine with only the shared baseline modules.
// Phase 2 replaces this with per-archetype boot.ts factories that create
// and provide the engine; App.vue becomes a generic consumer.
const engine = createEngine({
  gameId: 'open-loop-starter',
  tickRate: 20,
  autoSaveInterval: 60_000,
  maxSaveSlots: 30,
  mods: [{ id: 'default', name: 'Open Loop', modules: sharedBase }],
});

provide('engine', engine);
provide('currentScreen', currentScreen);

const showDevPanel = ref(false);

function onDevPanelKey(e: KeyboardEvent): void {
  if (!isDev) return;
  if (e.key === 'F12') {
    e.preventDefault();
    showDevPanel.value = !showDevPanel.value;
  }
}

onMounted(() => window.addEventListener('keydown', onDevPanelKey));
onUnmounted(() => window.removeEventListener('keydown', onDevPanelKey));

function activeModules() {
  const activeId = engine.activeModId;
  if (!activeId) return [];
  const mod = engine.mods.find((m) => m.id === activeId);
  return mod ? mod.modules : [];
}

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  engine.load();
  currentScreen.value = Screen.Game;
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    @start="startGame"
  />
  <GameScreen v-else-if="currentScreen === Screen.Game" />
  <ToastContainer />
  <DevDiagnostics v-if="isDev" />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench
      :engine="engine"
      :modules="activeModules"
    />
  </DevPanelOverlay>
</template>

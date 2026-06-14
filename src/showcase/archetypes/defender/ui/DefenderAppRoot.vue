<script setup lang="ts">
import { inject, provide, ref } from 'vue';
import { processOfflineTime, type Engine, type EngineModule } from '@open-loop/engine';
import { AppFrame, DevPanelOverlay, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import type { TowerId } from '../data/types';
import DefenderFrameLayout from './DefenderFrameLayout.vue';
import RoundStatusHeader from './panels/RoundStatusHeader.vue';
import TowerShop from './panels/TowerShop.vue';
import MapCanvas from './panels/MapCanvas.vue';
import EndGameOverlay from './panels/EndGameOverlay.vue';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

// Placement state shared across TowerShop (selector) and MapCanvas (target).
// `null` = no tower selected; clicking a tower button sets it, clicking the
// map clears after a successful placement or on right-click. Provided here so
// shop + canvas can stay independent panels.
const selectedTowerType = ref<TowerId | null>(null);
provide('defender:selectedTowerType', selectedTowerType);

const stack = useModalStack();

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  const result = engine.load();

  // Offline catch-up tick. Defender's economy is event-driven, but the loop
  // still advances bloon walk + cooldowns over the gap — bloons in-flight at
  // save time keep walking through the gap rather than freezing in place.
  if (result.success && result.timestamp != null) {
    const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
    if (gap > 0) processOfflineTime(engine.tickDriver, gap);
  }

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
  <AppFrame v-else :stack="stack" :tooltip-delay="400">
    <template #header>
      <SystemHeader app-name="Defender — Bloons" @return-to-slots="returnToSlots">
        <template #about>
          <h4 style="margin-bottom: 6px">Defender — Bloons</h4>
          <p>
            Place towers on buildable cells to pop bloons as they walk the path. Survive 10 rounds
            without losing all 40 lives. Stronger bloons (blue / green / yellow) shed into weaker
            children when popped — only red is the floor. Ice freezes; bombs splash and ignore the
            freeze; tack volleys cover short range; darts hit furthest-along-path.
          </p>
        </template>
      </SystemHeader>
    </template>
    <DefenderFrameLayout>
      <template #status>
        <RoundStatusHeader />
      </template>
      <template #map>
        <MapCanvas />
      </template>
      <template #shop>
        <TowerShop />
      </template>
    </DefenderFrameLayout>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics v-if="isDev" v-model:workbench-open="showDevPanel" />
  <EndGameOverlay v-if="currentScreen === Screen.Game" />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
  </DevPanelOverlay>
</template>

<script setup lang="ts">
import { inject, provide, ref } from 'vue';
import { processOfflineTime, type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import { MatchKey } from '../modules';
import TugFrameLayout from './TugFrameLayout.vue';
import LaneStrip from './panels/LaneStrip.vue';
import UnitShop from './panels/UnitShop.vue';
import FortressBars from './panels/FortressBars.vue';
import IncomeBar from './panels/IncomeBar.vue';
import CounterMatrixPanel from './panels/CounterMatrixPanel.vue';
import MatchEndSummary from './panels/MatchEndSummary.vue';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const stack = useModalStack();

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  const result = engine.load();

  // Catch-up advance for offline gap, then auto-start a match if none in
  // progress (skeleton plays-by-default; explicit "Start Match" lives only
  // on the match-end overlay).
  if (result.success && result.timestamp != null) {
    const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
    if (gap > 0) processOfflineTime(engine.loop, gap);
  }
  const match = engine.tryInject(MatchKey);
  if (match && !match.inMatch.value) match.start();

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
        app-name="Tug — SciFi Armada"
        @return-to-slots="returnToSlots"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Tug — SciFi Armada
          </h4>
          <p>
            Spend minerals to send units down the lane. Counter the AI's composition by picking
            archetypes that beat its dominant unit. Reduce the enemy fortress to zero before yours
            falls — or before the timer runs out.
          </p>
        </template>
      </SystemHeader>
    </template>
    <TugFrameLayout>
      <template #lane>
        <LaneStrip />
      </template>
      <template #shop>
        <UnitShop side="player" />
      </template>
      <template #matrix>
        <CounterMatrixPanel />
      </template>
      <template #income>
        <IncomeBar />
      </template>
      <template #stats>
        <FortressBars />
      </template>
    </TugFrameLayout>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics
    v-if="isDev"
    v-model:workbench-open="showDevPanel"
  />
  <MatchEndSummary v-if="currentScreen === Screen.Game" />
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

<!--
  TugAppRoot — routing + app chrome only (runs pre-`engine.start()`, on the slot
  screen), so it reads no module state. The match is in
  `<TugGameView>`, mounted under the post-start frame. The `onLoaded` seam below
  is the one legitimate root-side post-start seam (offline catch-up +
  auto-starting a match); see `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { processOfflineTime } from '@open-loop/engine';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { usePlaySession } from '@/composables/usePlaySession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import { MatchKey } from '../modules';
import TugGameView from './TugGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession({
  onLoaded: (result) => {
    // Catch-up advance for offline gap, then auto-start a match if none in
    // progress (skeleton plays-by-default; explicit "Start Match" lives only
    // on the match-end overlay).
    if (result.success && result.timestamp != null) {
      const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
      if (gap > 0) processOfflineTime(engine.tickDriver, gap);
    }
    const match = engine.tryInject(MatchKey);
    if (match && !match.inMatch.value) match.start();
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.displayName"
    @start="startGame"
  />
  <TugGameView v-else @return="returnToSlots" />
  <ToastContainer />
  <DevDiagnostics v-if="isDev" v-model:workbench-open="showDevPanel" />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
  </DevPanelOverlay>
</template>

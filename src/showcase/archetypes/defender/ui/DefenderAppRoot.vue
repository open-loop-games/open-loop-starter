<!--
  DefenderAppRoot — routing + app chrome only (runs pre-`engine.start()`, on the
  slot screen), so it reads no engine module state. The board lives in
  `<DefenderGameView>`, mounted under the post-start frame. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { processOfflineTime } from '@open-loop/engine';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import DefenderGameView from './DefenderGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession({
  onLoaded: (result) => {
    // Defender's economy is event-driven, but the loop still advances bloon
    // walk + cooldowns over the offline gap — bloons in-flight at save time
    // keep walking through the gap rather than freezing in place.
    if (result.success && result.timestamp != null) {
      const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
      if (gap > 0) processOfflineTime(engine.tickDriver, gap);
    }
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <DefenderGameView
    v-else
    @return="returnToSlots"
  />
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

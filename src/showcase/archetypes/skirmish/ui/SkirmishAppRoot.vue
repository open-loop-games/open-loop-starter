<!--
  SkirmishAppRoot — routing + app chrome only (runs pre-`engine.start()`), so it
  reads no engine module state in setup. The battlefield lives in
  `<SkirmishGameView>`, mounted under the post-start frame. The `onLoaded` seam
  auto-starts the first match — a legitimate post-start hook. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { usePlaySession } from '@/composables/usePlaySession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import { MatchKey } from '../modules';
import SkirmishGameView from './SkirmishGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession({
  onLoaded: () => {
    // Match module is only injectable post-start; kick off the first match.
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
  <SkirmishGameView v-else @return="returnToSlots" />
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

<!--
  ScalerAppRoot — routing + app chrome only (runs pre-`engine.start()`), so it
  reads no engine module state. The tier tabs + resource strip live in
  `<ScalerGameView>`, mounted under the post-start frame where the tier-module
  getters resolve. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import ScalerGameView from './ScalerGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession();

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
  <ScalerGameView
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

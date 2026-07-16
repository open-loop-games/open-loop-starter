<!--
  LooperAppRoot — routing + app chrome only (runs pre-`engine.start()`, on the
  slot screen), so it reads no engine module state. The adventuring loop lives in
  `<LooperGameView>`, mounted under the post-start frame. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { DevPanelOverlay } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import LooperGameView from './LooperGameView.vue';
import './looper-theme.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

onMounted(() => {
  document.body.dataset.archetype = 'looper';
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
});
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <LooperGameView
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

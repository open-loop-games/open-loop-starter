<!--
  ProducerAppRoot — routing + app chrome only (runs pre-`engine.start()`, on the
  slot screen), so it reads no engine module state. The bakery lives in
  `<ProducerGameView>`, mounted under the post-start frame. See
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
import ProducerGameView from './ProducerGameView.vue';
import './producer-theme.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Fraunces:ital,opsz,wght,SOFT@0,9..144,500..900,100;1,9..144,500..900,100&' +
  'family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&' +
  'display=swap';

function ensureBakeryFonts(): void {
  if (document.getElementById('bakery-fonts')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const stylesheet = document.createElement('link');
  stylesheet.id = 'bakery-fonts';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONTS_HREF;
  document.head.append(preconnect1, preconnect2, stylesheet);
}

onMounted(() => {
  document.body.dataset.archetype = 'producer';
  ensureBakeryFonts();
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
  <ProducerGameView
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

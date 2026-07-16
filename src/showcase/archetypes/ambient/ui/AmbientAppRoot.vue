<!--
  AmbientAppRoot — routing + app chrome only (runs pre-`engine.start()`), so it
  reads no engine module state in setup. The almanac lives in
  `<AmbientGameView>`, mounted under the post-start frame. The one post-start
  read here is `useGameSession`'s `onLoaded` resume seam (offline catch-up +
  welcome-back), which runs after `start()`. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue';
import { Decimal, processOfflineTime } from '@open-loop/engine';
import { DevPanelOverlay, modalStackKey, useModalStack } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { manifest } from '../manifest';
import { SessionClockKey, getPrimaryResource, getUnlocks } from '../modules';
import WelcomeBackOverlay from './panels/WelcomeBackOverlay.vue';
import AmbientGameView from './AmbientGameView.vue';
import './ambient-theme.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession({
  onLoaded: (result) => {
    // Resume sequence (session-clock.ts inline doc): write the wall-clock
    // catch-up gap before processOfflineTime so SessionClock observers see
    // the correct gap during the catch-up advance, then refresh
    // elapsedAtResume so secondsSinceLastResume measures live-session time
    // only (excluding the catch-up). The pre/post primary snapshot brackets
    // processOfflineTime so the welcome-back overlay can quote the delta
    // grown while away.
    let resumeGapSec = 0;
    let resumeDelta = new Decimal(0);
    if (result.success && result.timestamp != null) {
      const sessionClock = engine.tryInject(SessionClockKey);
      const primary = getPrimaryResource();
      const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
      resumeGapSec = gap;
      if (sessionClock) sessionClock.lastResumeGapSec.value = gap;
      if (gap > 0) {
        const before = Decimal.fromValue(primary.value);
        processOfflineTime(engine.tickDriver, gap, {
          maxOfflineSeconds: sessionClock?.offlineCapSeconds,
        });
        resumeDelta = Decimal.sub(primary.value, before);
      }
      sessionClock?.refreshElapsedAtResume();
    }
    maybeShowWelcomeBack(resumeGapSec, resumeDelta);
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&' +
  'family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&' +
  'display=swap';

function ensureAlmanacFonts(): void {
  if (document.getElementById('almanac-fonts')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const stylesheet = document.createElement('link');
  stylesheet.id = 'almanac-fonts';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONTS_HREF;
  document.head.append(preconnect1, preconnect2, stylesheet);
}

onMounted(() => {
  document.body.dataset.archetype = 'ambient';
  ensureAlmanacFonts();
});

onUnmounted(() => {
  delete document.body.dataset.archetype;
});

// Owned here (the resume/welcome-back seam below pushes into it) and shared
// with AmbientGameView's AppFrame + almanac action via provide/inject.
const stack = useModalStack();
provide(modalStackKey, stack);

const WELCOME_BACK_MIN_GAP_SEC = 60;
const WELCOME_BACK_UNLOCK_ID = 'returns-welcomed';
function maybeShowWelcomeBack(gapSec: number, sproutDelta: Decimal): void {
  if (gapSec < WELCOME_BACK_MIN_GAP_SEC) return;
  if (getUnlocks().getPurchasable(WELCOME_BACK_UNLOCK_ID)?.active.value !== true) return;
  const id = stack.push(WelcomeBackOverlay, {
    gapSec,
    sproutDelta,
    onClose: () => stack.remove(id),
  });
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <AmbientGameView
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

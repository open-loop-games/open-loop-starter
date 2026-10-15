<!--
  ProducerAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO module state. The game lives in
  `<ProducerGameView>`, mounted under the post-start `v-else` frame where module
  reads are safe. The one post-start read here is `usePlaySession`'s `onLoaded`
  resume seam (offline catch-up and the bookkeeper's note), which runs after
  `start()`. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { AppFrame, DevPanelOverlay, useModalStack } from '@/lib';
import { Screen } from '@/types';
import { usePlaySession } from '@/composables/usePlaySession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import { OFFLINE_WINDOW_SECONDS } from '../data';
import { OfflineKey } from '../modules';
import ProducerGameView from './ProducerGameView.vue';
import ReturnReport from './components/ReturnReport.vue';
// The costume, applied under `.consolidated`. Imported at the root so the slot
// screen and the app chrome sit on the same desk.
import './consolidated.css';

const stack = useModalStack();

/** A shorter return is a reload, not time away, and gets no report. */
const REPORT_MIN_AWAY_SECONDS = 60;

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession({
  onLoaded: (result) => {
    const offline = engine.tryInject(OfflineKey);
    if (!offline || !result.success) return;
    const report = offline.catchUp(engine.tickDriver, result.timestamp ?? undefined);
    if (report.caughtUpSeconds < REPORT_MIN_AWAY_SECONDS) return;
    stack.push(ReturnReport, { report, windowSeconds: OFFLINE_WINDOW_SECONDS });
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope for the slot screen and the frame alike; the frame's modals
    mount inside it, so they wear the costume too.
  -->
  <div class="consolidated">
    <SlotScreen
      v-if="currentScreen === Screen.Slots"
      :engine="engine"
      :app-name="manifest.displayName"
      @start="startGame"
    />
    <AppFrame v-else :stack="stack" :tooltip-delay="400">
      <template #header>
        <SystemHeader :app-name="manifest.displayName" @return-to-slots="returnToSlots">
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You found a holding company on one pushcart. Close deals by hand until your carts
              out-earn you, then buy newsstands, diners, laundromats and on up to savings banks.
              Each acquisition raises the next seller's price. Then hire people to do it for you.
              Nothing opposes you and nothing resets: the curve is the content.
            </p>
          </template>
        </SystemHeader>
      </template>
      <ProducerGameView />
    </AppFrame>
    <ToastContainer />
    <DevDiagnostics v-if="isDev" v-model:workbench-open="showDevPanel" />
    <DevPanelOverlay
      v-if="isDev && showDevPanel"
      title="Balance Workbench"
      @close="showDevPanel = false"
    >
      <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
    </DevPanelOverlay>
  </div>
</template>

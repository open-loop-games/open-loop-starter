<!--
  ProducerAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO engine module state. The game lives in
  `<ProducerGameView>`, mounted under the post-start `v-else` frame where module
  reads are safe. The one post-start read here is `usePlaySession`'s `onLoaded`
  resume seam (offline catch-up + the return report), which runs after
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
// The costume, applied under `.producer`. Imported at the root rather than in
// the game view so the slot screen and app chrome are drawn on the same sheet.
// Portaled surfaces (tooltips) can't inherit that ancestor, so their rules in
// this file are deliberately unscoped — see its header.
import './blueprint.css';

const stack = useModalStack();

/** A shorter return is a reload, not an absence, and gets no report. */
const REPORT_MIN_AWAY_SECONDS = 60;

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession({
  onLoaded: (result) => {
    const offline = engine.tryInject(OfflineKey);
    if (!offline || !result.success) return;
    const report = offline.catchUp(engine.tickDriver, result.timestamp ?? undefined);
    if (report.caughtUpSeconds < REPORT_MIN_AWAY_SECONDS) return;
    const id = stack.push(ReturnReport, {
      report,
      windowSeconds: OFFLINE_WINDOW_SECONDS,
      onClose: () => stack.remove(id),
    });
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a
    class on the component is dropped rather than inherited — the wrapper is
    what gives `blueprint.css` an ancestor to hang off. It is a styling scope
    only and adds no layout of its own.
  -->
  <div class="producer">
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
              Seed one self-replicating probe into a dead system. It converts matter into more
              probes. Nothing opposes you, nothing expires, nothing resets — each launch reaches a
              further star, so the next one costs more. The curve is the content.
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

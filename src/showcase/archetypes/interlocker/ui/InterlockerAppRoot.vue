<!--
  InterlockerAppRoot — routing + app chrome only. Runs before `engine.start()` (on the
  slot screen), so it reads NO module state. The game is in `<InterlockerGameView>`;
  the masthead's live readouts are `<WorksTallies>`, a child in SystemHeader's slot.
  Both mount under the post-start `v-else` frame.
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
import InterlockerGameView from './InterlockerGameView.vue';
import WorksTallies from './components/WorksTallies.vue';
// The costume, applied under `.interlocker`. Imported at the root so the slot screen
// and the app chrome are drawn on the same paper.
import './cyanotype.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope for the slot screen and the frame alike; the frame's modals mount
    inside it, so they wear the costume too.
  -->
  <div class="interlocker">
    <SlotScreen
      v-if="currentScreen === Screen.Slots"
      :engine="engine"
      :app-name="manifest.displayName"
      @start="startGame"
    />
    <AppFrame v-else :stack="stack" :tooltip-delay="400">
      <template #header>
        <SystemHeader
          app-name="The Aluminium Empire"
          subtitle="Imperial Aeroworks · Le Bourget · an aluminium age that came forty years early"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              In 1855 Deville's aluminium came cheap, and the Second Empire builds aeroplanes. Raise
              timber yards, gardens, bauxite pits and coal drifts; patent the processes that turn
              them into spars, aluminium and engines; seat the compagnons at each trade, and keep
              them fed. Fill a hangar for the Exposition Universelle, and the works are cleared and
              rebuilt with the Emperor's renown behind them.
            </p>
          </template>
          <template #extra-actions>
            <WorksTallies />
          </template>
        </SystemHeader>
      </template>
      <InterlockerGameView />
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

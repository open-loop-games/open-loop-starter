<!--
  ExplorerAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO module state. The game lives in
  `<ExplorerGameView>`; the masthead's live readouts are `<WoldTallies>`, a
  child in SystemHeader's slot. Both mount under the post-start `v-else` frame.
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
import ExplorerGameView from './ExplorerGameView.vue';
import WoldTallies from './components/WoldTallies.vue';
// The costume, applied under `.explorer`. Imported at the root so the slot
// screen and the app chrome are lit by the same lamp.
import './hartwold.css';

const { engine, currentScreen, startGame, returnToSlots } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope for the slot screen and the frame alike; the frame's modals
    mount inside it, so they wear the costume too.
  -->
  <div class="explorer">
    <SlotScreen
      v-if="currentScreen === Screen.Slots"
      :engine="engine"
      :app-name="manifest.displayName"
      @start="startGame"
    />
    <AppFrame v-else :stack="stack" :tooltip-delay="400">
      <template #header>
        <SystemHeader
          app-name="Spoor"
          subtitle="the Hartwold, uncharted"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You are the last huntsman of a lodge at the edge of a fogged forest. Walk the wold one
              tile at a time on jerky and water, hunt what you find, and carry it home: the pack
              banks at the lodge, and what you chart banks at the lodge or a camp. Take the dens'
              trophies, refit for deeper country, and track the Pale Hart to its lair. Nothing
              resets; the reward is territory.
            </p>
          </template>
          <template #extra-actions>
            <WoldTallies />
          </template>
        </SystemHeader>
      </template>
      <ExplorerGameView />
    </AppFrame>
    <ToastContainer />
    <DevDiagnostics v-if="isDev" v-model:workbench-open="showDevPanel" />
    <DevPanelOverlay
      v-if="isDev && showDevPanel"
      title="Balance Workbench"
      @close="showDevPanel = false"
    >
      <BalanceWorkbench :engine="engine" />
    </DevPanelOverlay>
  </div>
</template>

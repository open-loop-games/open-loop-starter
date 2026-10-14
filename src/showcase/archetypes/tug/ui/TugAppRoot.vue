<!--
  TugAppRoot — routing + app chrome only. Runs before `engine.start()` (on the slot screen),
  so it reads NO module state. The game lives in `<TugGameView>`, mounted under the
  post-start `v-else` frame where module reads are safe. See
  `.claude/rules/app-root-discipline.md`.
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
import TugGameView from './TugGameView.vue';
// The costume, applied under `.causeway-costume`. Imported at the root so the slot screen
// and the app chrome sit in the same hall.
import './causeway.css';

const stack = useModalStack();
// A battle is played, not left running: a load resumes it where it stood, with no offline
// catch-up.
const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <div class="causeway-costume">
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
              Fairhold and a neighbouring lord's keep face each other across a causeway one road
              wide. Raise yeomen, bowmen, knights and, late in the season, a mangonel; they wait in
              the bailey until your horn sounds, then march out in ranks. Hold the Homeward Road,
              break their gate, and the Chronicle remembers.
            </p>
          </template>
        </SystemHeader>
      </template>
      <TugGameView />
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

<!--
  SurvivorAppRoot — routing + app chrome only. Runs before `engine.start()` (on the slot
  screen), so it reads NO module state. The game lives in `<SurvivorGameView>`, mounted under
  the post-start `v-else` frame where module reads are safe. See
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
import { credits } from '../credits';
import SurvivorGameView from './SurvivorGameView.vue';
// The costume, applied under `.soundstage-costume`. Imported at the root so the slot screen
// and the app chrome sit on the same set.
import './soundstage.css';

const stack = useModalStack();
// A take is played, not left running: a load returns to the call sheet, with no offline
// catch-up.
const { engine, currentScreen, startGame, returnToSlots } = usePlaySession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <div class="soundstage-costume">
    <SlotScreen
      v-if="currentScreen === Screen.Slots"
      :engine="engine"
      :app-name="manifest.displayName"
      @start="startGame"
    />
    <AppFrame v-else :stack="stack" :tooltip-delay="400">
      <template #header>
        <SystemHeader
          :credits="credits"
          :app-name="manifest.displayName"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You are the stunt double on an action set that never wraps. Extras pour onto the
              soundstage from every side; the effects crew fires your rigs on their own cues. All
              you choose is where to stand. Bank the reels the fallen drop, take the writers' pages,
              and hold the floor to CUT so your agent can sign bigger stars.
            </p>
            <p>
              Call the moves yourself, or let the star improvise and watch their instinct play the
              take: the same mechanics either way.
            </p>
          </template>
        </SystemHeader>
      </template>
      <SurvivorGameView />
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

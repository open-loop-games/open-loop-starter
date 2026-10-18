<!--
  SkirmishAppRoot — routing + app chrome only. Runs before `engine.start()` (on the slot
  screen), so it reads NO module state. The game lives in `<SkirmishGameView>`, mounted
  under the post-start `v-else` frame where module reads are safe. See
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
import SkirmishGameView from './SkirmishGameView.vue';
// The costume, applied under `.cantrip-costume`. Imported at the root so the slot screen
// and the app chrome sit on the same street.
import './cantrip.css';

const stack = useModalStack();
// A match is played, not left running: a load resumes it where it stood, with no offline
// catch-up.
const { engine, currentScreen, startGame, returnToSlots } = usePlaySession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <div class="cantrip-costume">
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
              Rain on the sprawl, and the old ley lines awake under the streets. You run a shadow
              crew for the Lantern Syndicate: hire hustlers for scrip, sink ley taps for aether, and
              train Razorboys, Hexers, Riggers and leased Enforcers. Take the three districts from a
              rival crew, order an assault from one you hold, and burn their safehouse before they
              burn yours. Every contract won hires a lieutenant.
            </p>
          </template>
        </SystemHeader>
      </template>
      <SkirmishGameView />
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

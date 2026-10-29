<!--
  ScripterAppRoot — routing + app chrome only. Runs before `engine.start()` (on the
  slot screen), so it reads NO module state. The game lives in
  `<ScripterGameView>`, mounted under the post-start `v-else` frame where module
  reads are safe. See `.claude/rules/app-root-discipline.md`.
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
import ScripterGameView from './ScripterGameView.vue';
// The costume, applied under `.inkfist`. Imported at the root so the slot screen
// and the app chrome sit on the same page.
import './inkfist.css';

const stack = useModalStack();
const { engine, currentScreen, startGame, returnToSlots } = usePlaySession();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope for the slot screen and the frame alike; the frame's modals
    mount inside it, so they wear the costume too.
  -->
  <div class="inkfist">
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
              You are an old master who can no longer fight. You write kata, scrolls of moves, and
              your student performs them line by line. Challengers come to the gate, each with a
              pattern the old scroll cannot answer; their arrival puts the answering technique on
              the shelf, and the rewrite is the game. Graduate the student on pilgrimage to bank
              Insight; the scroll and the rack survive.
            </p>
          </template>
        </SystemHeader>
      </template>
      <ScripterGameView />
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

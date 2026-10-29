<!--
  PhaseShifterAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO module state. The game lives in
  `<PhaseShifterGameView>`, mounted under the post-start `v-else` frame.
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
import PhaseShifterGameView from './PhaseShifterGameView.vue';
// The costume, applied under `.phase-shifter`. Imported at the root so the
// slot screen and the app chrome are lit by the same lamp.
import './night-clerk.css';

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
  <div class="phase-shifter">
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
          app-name="Night Clerk"
          subtitle="County Records · Sub-basement B"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              A box with no label comes down the chute at 2:14 a.m.: the file on a schoolteacher who
              vanished in 1979. Read it, pin it to a board, then rebuild the night as a model you
              replay until six alibis hold. Each door is one-way: what it retires is filed away for
              good.
            </p>
          </template>
        </SystemHeader>
      </template>
      <PhaseShifterGameView />
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

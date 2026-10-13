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
import Button from '@/ui/components/Button.vue';
import { manifest } from '../manifest';
import PhaseShifterGameView from './PhaseShifterGameView.vue';
// The costume, applied under `.phase-shifter`. Imported at the root so the
// slot screen and the app chrome are lit by the same lamp.
import './night-clerk.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a class
    on the component is dropped; the wrapper gives `night-clerk.css` an ancestor.
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
        <SystemHeader :app-name="manifest.displayName" @return-to-slots="returnToSlots">
          <template #title="{ returnToSlots: back }">
            <Button
              class="nc-brand"
              data-testid="return-to-slots"
              title="Save and return to save picker"
              @click="back()"
            >
              <h1>Night Clerk</h1>
              <span class="nc-brand-sub">County Records &middot; Sub-basement B</span>
            </Button>
          </template>
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
      <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
    </DevPanelOverlay>
  </div>
</template>

<style scoped>
.nc-brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.nc-brand h1 {
  margin: 0;
  font-weight: 500;
  font-size: 26px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--nc-manila);
  line-height: 1;
}
.nc-brand-sub {
  font-size: 15px;
  color: var(--nc-carbon);
}
</style>

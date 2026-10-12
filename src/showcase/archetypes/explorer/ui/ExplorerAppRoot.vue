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
import Button from '@/ui/components/Button.vue';
import { manifest } from '../manifest';
import ExplorerGameView from './ExplorerGameView.vue';
import WoldTallies from './components/WoldTallies.vue';
// The costume, applied under `.explorer`. Imported at the root so the slot
// screen and the app chrome are lit by the same lamp.
import './hartwold.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a class
    on the component is dropped; the wrapper gives `hartwold.css` an ancestor.
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
        <SystemHeader :app-name="manifest.displayName" @return-to-slots="returnToSlots">
          <template #title="{ returnToSlots: back }">
            <Button
              class="sp-brand"
              data-testid="return-to-slots"
              title="Save and return to save picker"
              @click="back()"
            >
              <h1>Spoor</h1>
              <span class="sp-brand-sub">the Hartwold, uncharted</span>
            </Button>
          </template>
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You are the last huntsman of a lodge at the edge of a fogged forest. Walk the wold one
              tile at a time on a satchel of jerky, hunt what you find, and carry the haul home: the
              pack banks only at the lodge. Refit for deeper country until you can track the Pale
              Hart to its lair. Nothing resets; the reward is territory.
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
      <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
    </DevPanelOverlay>
  </div>
</template>

<style scoped>
.sp-brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.sp-brand h1 {
  margin: 0;
  font-family: var(--sp-face-display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: 0.08em;
  color: var(--sp-tallow);
  line-height: 1;
}
.sp-brand-sub {
  font-style: italic;
  font-size: 14px;
  color: var(--sp-birch-dim);
}
</style>

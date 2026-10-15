<!--
  PackerAppRoot — routing + app chrome only. Runs before `engine.start()` (on the slot
  screen), so it reads NO module state. The game is in `<PackerGameView>`; the header's
  live gauges are `<HardpointGauges>`, a child in SystemHeader's slot. Both mount under
  the post-start `v-else` frame.
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
import PackerGameView from './PackerGameView.vue';
import HardpointGauges from './components/HardpointGauges.vue';
// The costume, applied under `.hardpoint`. Imported at the root so the slot screen and
// the app chrome are drawn on the same hull.
import './hardpoint.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a class on the
    component is dropped; the wrapper gives `hardpoint.css` an ancestor.
  -->
  <div class="hardpoint">
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
              class="hp-brand"
              data-testid="return-to-slots"
              title="Save and return to save picker"
              @click="back()"
            >
              <h1>Hardpoint</h1>
              <span class="hp-brand-sub">fitting bay · breach line</span>
            </Button>
          </template>
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You are the fitter aboard a frigate holding a breach line against a drone swarm. The
              guns fire on their own; your job is the hull. Every module's worth comes from what
              sits next to it: fabricate in the bay, then fit, lift and swap freely until the firing
              solution reads right. Drones downed become salvage, and salvage plates the hull out
              from a corvette core to a frigate.
            </p>
          </template>
          <template #extra-actions>
            <HardpointGauges />
          </template>
        </SystemHeader>
      </template>
      <PackerGameView />
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
.hp-brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.hp-brand h1 {
  margin: 0;
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 24px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--readout);
  line-height: 1;
}
.hp-brand-sub {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--blueprint-dim);
}
.hp-brand:hover h1 {
  color: var(--blueprint);
}
</style>

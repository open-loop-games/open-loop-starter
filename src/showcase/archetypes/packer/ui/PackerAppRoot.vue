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
import { manifest } from '../manifest';
import { credits } from '../credits';
import { CARRIER_WINDOW_S } from '../data';
import PackerGameView from './PackerGameView.vue';
import HardpointGauges from './components/HardpointGauges.vue';
// The costume, applied under `.hardpoint`. Imported at the root so the slot screen and
// the app chrome are drawn on the same hull.
import './hardpoint.css';

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
  <div class="hardpoint">
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
          app-name="Hardpoint"
          subtitle="fitting bay · breach line"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              You are the fitter aboard the frigate Hardpoint, holding a breach line against a drone
              swarm. The guns fire on their own; your job is the hull. Every module's worth comes
              from what sits next to it: fabricate in the bay, then fit, lift, turn and swap freely
              until the firing solution reads right. Salvage plates the hull out from a corvette
              core.
            </p>
            <p>
              Once the cruiser keel is plated the breach line opens. Each sector is held by a
              carrier and brings conditions that rewrite the board. Engage it, and your firepower
              has {{ CARRIER_WINDOW_S }} seconds to break its hull. When a ship's last carrier
              falls, commission the next: the lancer Longreach, then the flagship Sovereign.
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
      <BalanceWorkbench :engine="engine" />
    </DevPanelOverlay>
  </div>
</template>

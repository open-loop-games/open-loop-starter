<!--
  LooperAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO module state. The game lives in
  `<LooperGameView>`; the masthead's live readouts are `<NightTallies>`, a child
  in SystemHeader's slot. Both mount under the post-start `v-else` frame.
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
import LooperGameView from './LooperGameView.vue';
import NightTallies from './components/NightTallies.vue';
// The costume, applied under `.looper`. Imported at the root so the slot screen
// and the app chrome are drawn in the same night.
import './lights-out.css';

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
  <div class="looper">
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
          app-name="Lights Out"
          subtitle="Blackwater Penitentiary · Cell 4471"
          @return-to-slots="returnToSlots"
        >
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              Inmate 4471 relives the same night. At lights-out you write a plan, and the plan runs.
              Every second costs Nerve; when it breaks, you wake at lights-out again. Your skills
              keep part of what each night taught them, and the notes under the bunk keep the rest.
              The game is the diff between two nights.
            </p>
          </template>
          <template #extra-actions>
            <NightTallies />
          </template>
        </SystemHeader>
      </template>
      <LooperGameView />
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

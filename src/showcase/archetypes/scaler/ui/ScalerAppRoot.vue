<!--
  ScalerAppRoot — routing + app chrome only. Runs before `engine.start()` (on the
  slot screen), so it reads NO module state. The game lives in
  `<ScalerGameView>`, mounted under the post-start `v-else` frame where module
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
import ScalerGameView from './ScalerGameView.vue';
// The costume, applied under `.paragon`. Imported at the root so the slot screen
// and the app chrome sit on the same page.
import './paragon.css';

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
  <div class="paragon">
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
              You run a hero corps over a city at night. Heroes earn Justice on their own; each
              recruit costs more than the last. Reboot the timeline to bank Legacy, take on
              Elseworlds under worse rules for permanent rewards, and once the legends run deep
              enough, rewrite the multiverse and keep only Continuity. Each layer compresses the one
              below it.
            </p>
          </template>
        </SystemHeader>
      </template>
      <ScalerGameView />
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

<script setup lang="ts">
import { ref } from 'vue';
import { AppFrame, DevPanelOverlay, SingleColumnShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import { MatchKey } from '../modules';
import BattlefieldScreen from './BattlefieldScreen.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession({
  onLoaded: () => {
    // Match module is only injectable post-start; kick off the first match.
    const match = engine.tryInject(MatchKey);
    if (match && !match.inMatch.value) match.start();
  },
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const stack = useModalStack();
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <AppFrame
    v-else
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="returnToSlots"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            {{ manifest.name }}
          </h4>
          <p>
            Continuous tactical RTS — bot vs bot of built-in AI on a pixi/webgl field. Both sides
            are played by the shipping AI; player control is a stretch goal.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell>
      <BattlefieldScreen />
    </SingleColumnShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics
    v-if="isDev"
    v-model:workbench-open="showDevPanel"
  />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench
      :engine="engine"
      :modules="getActiveModules"
    />
  </DevPanelOverlay>
</template>

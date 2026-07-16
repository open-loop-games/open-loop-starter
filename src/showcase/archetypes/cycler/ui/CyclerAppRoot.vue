<!--
  CyclerAppRoot — routing + app chrome only. Runs before `engine.start()` (on the
  slot screen), so it reads NO engine module state. The game lives in
  `<CyclerGameView>`, mounted under the post-start `v-else` frame where module
  reads are safe. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { AppFrame, DevPanelOverlay, useModalStack } from '@/lib';
import { Screen } from '@/types';
import { useGameSession } from '@/composables/useGameSession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import CyclerGameView from './CyclerGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
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
            A containment vessel holds against a rising thermal load. Capacity saturates to a
            ceiling <strong>D_max</strong>; an exogenous, escalating <strong>burn</strong> overtakes
            it — and when it does, the run ends and pays out. Spend
            <strong>Fragments</strong> between runs: <em>Reinforce</em> raises the ceiling (reach,
            not run length under the peg), <em>Dampen</em> bends the escalation back. Advance a
            <em>burn tier</em> to raise the stakes.
          </p>
        </template>
      </SystemHeader>
    </template>
    <CyclerGameView />
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

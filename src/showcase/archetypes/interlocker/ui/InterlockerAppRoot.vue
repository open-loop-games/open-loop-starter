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
import InterlockerGameView from './InterlockerGameView.vue';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = useGameSession();

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
            Interlocker — Kittens
          </h4>
          <p>
            Build catnip fields to feed your kittens, assign them to jobs to harvest wood, minerals,
            and science, then research up to architecture and craft your first megalith. The graph
            is wide and the pressure is the same Kittens players know — every kitten assigned away
            from farming trades against the catnip rate that keeps the colony alive.
          </p>
        </template>
      </SystemHeader>
    </template>
    <InterlockerGameView />
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

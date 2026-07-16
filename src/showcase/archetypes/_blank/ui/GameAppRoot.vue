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

// Slot-pick → start → load → play → save → back. `useGameSession` owns it;
// pass `onLoaded` when your game needs to do something with the offline gap.
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
            A blank game on the scaffold. Add modules under
            <code>src/game/modules/</code> and render them here.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell>
      <section class="game-placeholder">
        <h2>Hello from your new game.</h2>
        <p>
          The scaffold is wired: engine, save slots, settings, theme, and the dev workbench all
          work. Start building by adding an engine module in
          <code>src/game/modules/</code> and a component to render its state.
        </p>
      </section>
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

<style scoped>
.game-placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap-lg);
  text-align: center;
}
</style>

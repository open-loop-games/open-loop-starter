<!--
  SurvivorAppRoot — routing + app chrome only. Runs before `engine.start()` (on the
  slot screen), so it reads NO engine module state. The game lives in
  `<SurvivorGameView>`, mounted under the post-start `v-else` frame where module reads
  are safe. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { AppFrame, DevPanelOverlay, useModalStack } from '@/lib';
import { Screen } from '@/types';
import { usePlaySession } from '@/composables/usePlaySession';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import SurvivorGameView from './SurvivorGameView.vue';
import './survivor-theme.css';

// Slot-pick → start → load → play → save → back. `usePlaySession` owns it;
// pass `onLoaded` when your game needs to do something with the offline gap.
const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

// Scopes the Containment costume to this archetype so the gallery's others are
// untouched. Fonts are local stacks declared in the theme — nothing is fetched.
onMounted(() => {
  document.body.dataset.archetype = 'survivor';
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
});
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.displayName"
    @start="startGame"
  />
  <AppFrame v-else :stack="stack" :tooltip-delay="400">
    <template #header>
      <SystemHeader :app-name="manifest.displayName" @return-to-slots="returnToSlots">
        <template #about>
          <h4 style="margin-bottom: 6px">
            {{ manifest.displayName }}
          </h4>
          <p>
            Wave Escalation + Cooldown-Rotation + Run-Scoped Upgrade Tree + Cross-Run Meta. One
            operator on a scrolling floor, apparatus firing on its own cadences. You never aim — you
            only decide where to stand, and the collect radius is smaller than the kill radius, so
            banking income means diving back through what you just cleared.
          </p>
          <p>
            Assign the floor to yourself and drive with WASD, or hand it to one of four AI policies
            and watch its theory of survival play out — same mechanics either way, which is what
            lets the arc be balanced headless. See <code>IDENTITY.md</code> for the spine.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SurvivorGameView />
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
</template>

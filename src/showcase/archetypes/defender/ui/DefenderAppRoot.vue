<!--
  DefenderAppRoot — routing + app chrome only. Runs before `engine.start()` (on
  the slot screen), so it reads NO module state. The game lives in
  `<DefenderGameView>`, mounted under the post-start `v-else` frame.
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
import DefenderGameView from './DefenderGameView.vue';
// The costume, applied under `.defender`. Imported at the root so the slot
// screen and the app chrome stand in the same garden.
import './walled-garden.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a class
    on the component is dropped; the wrapper gives `walled-garden.css` an ancestor.
  -->
  <div class="defender">
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
              class="wg-brand"
              data-testid="return-to-slots"
              title="Save and return to save picker"
              @click="back()"
            >
              <h1>The Walled Garden</h1>
              <span class="wg-brand-sub">Kitchen garden &middot; after dusk</span>
            </Button>
          </template>
          <template #about>
            <h4 style="margin-bottom: 6px">{{ manifest.displayName }}</h4>
            <p>
              Every evening the pests come through the gap in the wall and make for the seedbed.
              Plant hedges to send them the long way round, and along the path whatever answers the
              night ahead: thrushes for slugs and beetles, bats for the moths that fly over it all,
              ladybirds for greenfly. Then watch the night play out. Whatever a plot teaches you
              goes into the almanac, and stays.
            </p>
          </template>
        </SystemHeader>
      </template>
      <DefenderGameView />
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
.wg-brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.wg-brand h1 {
  margin: 0;
  font-family: var(--wg-face-display);
  font-variation-settings: 'SOFT' 100;
  font-weight: 600;
  font-size: 27px;
  color: var(--wg-parchment);
  line-height: 1;
}
.wg-brand-sub {
  font-size: 15px;
  font-style: italic;
  color: var(--wg-twine);
}
</style>

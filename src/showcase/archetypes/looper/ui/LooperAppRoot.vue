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
import Button from '@/ui/components/Button.vue';
import { manifest } from '../manifest';
import LooperGameView from './LooperGameView.vue';
import NightTallies from './components/NightTallies.vue';
// The costume, applied under `.looper`. Imported at the root so the slot screen
// and the app chrome are drawn in the same night.
import './lights-out.css';

const { engine, currentScreen, startGame, returnToSlots, getActiveModules } = usePlaySession();

const stack = useModalStack();

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope. AppFrame's root node is a TooltipProvider fragment, so a class
    on the component is dropped; the wrapper gives `lights-out.css` an ancestor.
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
        <SystemHeader :app-name="manifest.displayName" @return-to-slots="returnToSlots">
          <template #title="{ returnToSlots: back }">
            <Button
              class="lo-brand"
              data-testid="return-to-slots"
              title="Save and return to save picker"
              @click="back()"
            >
              <h1>Lights Out</h1>
              <span class="lo-brand-sub">Blackwater Penitentiary · Cell 4471</span>
            </Button>
          </template>
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
      <BalanceWorkbench :engine="engine" :modules="getActiveModules" />
    </DevPanelOverlay>
  </div>
</template>

<style scoped>
.lo-brand {
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
.lo-brand h1 {
  margin: 0;
  font-family: var(--lo-face-stencil);
  font-weight: normal;
  font-size: 30px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lo-searchlight);
  line-height: 1;
}
.lo-brand-sub {
  font-size: 13px;
  color: var(--lo-ink-faded);
}
</style>

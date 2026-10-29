<!--
  CyclerAppRoot — routing + app chrome only. Runs before `engine.start()` (on the slot
  screen), so it reads NO module state. The game lives in `<CyclerGameView>`, mounted under
  the post-start `v-else` frame where module reads are safe. The one post-start read here is
  `usePlaySession`'s `onLoaded`, which opens the first watch on a new save. See
  `.claude/rules/app-root-discipline.md`.
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
import { WatchKey } from '../modules';
import CyclerGameView from './CyclerGameView.vue';
// The costume, applied under `.skerry`. Imported at the root so the slot screen and the
// app chrome sit on the same rock.
import './skerry.css';

const stack = useModalStack();
// The rock's clock stops while the tab is closed: a watch is played, not left running, so
// a load does no offline catch-up. The first watch needs no choosing.
const { engine, currentScreen, startGame, returnToSlots } = usePlaySession({
  onLoaded: () => engine.tryInject(WatchKey)?.openFirstWatch(),
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <!--
    Costume scope for the slot screen and the frame alike; the frame's modals
    mount inside it, so they wear the costume too.
  -->
  <div class="skerry">
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
              You keep the light on a bare rock in the North Atlantic. By day you haul the tide nets
              and set breakwaters, buttresses and winches; each dawn names the quarter tonight's
              gale will come from. By night the breakers land on that side, and what your walls
              cannot turn goes into the tower. When the tower falls the light goes out, and the
              logbook buys knowledge that outlasts the watch.
            </p>
          </template>
        </SystemHeader>
      </template>
      <CyclerGameView />
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

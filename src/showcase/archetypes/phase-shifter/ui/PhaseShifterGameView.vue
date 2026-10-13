<!--
  PhaseShifterGameView — the in-game subtree, mounted under the root's
  post-start frame. One column: the phase tabs, the current phase's desk, the
  next door, what the doors have filed away, and the carbon. Once the last
  door opens, the ending replaces all of it.
-->
<script setup lang="ts">
import { inject } from 'vue';
import type { Engine } from '@open-loop/engine';
import { SingleColumnShell } from '@/lib';
import { getAutomation, getBoard, getBox, getCase, getNight } from '../modules';
import BoxPanel from './panels/BoxPanel.vue';
import BoardPanel from './panels/BoardPanel.vue';
import NightPanel from './panels/NightPanel.vue';
import PhaseTabs from './components/PhaseTabs.vue';
import DoorEnvelope from './components/DoorEnvelope.vue';
import FiledAway from './components/FiledAway.vue';
import CaseLog from './components/CaseLog.vue';
import Ending from './components/Ending.vue';

const kase = getCase();
const phase = kase.life.doorsOpened;

// Dev-only state hook for browser probes: reads live module state without an
// `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__nightClerk = {
    case: kase,
    box: getBox(),
    board: getBoard(),
    night: getNight(),
    automation: getAutomation(),
    engine,
    skip: (seconds: number) => engine.tickDriver.advanceTime(seconds),
  };
}
</script>

<template>
  <SingleColumnShell max-width="680px">
    <Ending v-if="kase.closed.value" />
    <template v-else>
      <PhaseTabs :phase="phase" />
      <BoxPanel v-if="phase === 0" />
      <BoardPanel v-else-if="phase === 1" />
      <NightPanel v-else />
      <DoorEnvelope />
      <FiledAway />
      <CaseLog />
    </template>
  </SingleColumnShell>
</template>

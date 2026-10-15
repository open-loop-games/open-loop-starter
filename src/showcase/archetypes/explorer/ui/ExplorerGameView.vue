<!--
  ExplorerGameView — the in-game subtree, mounted under the root's post-start
  frame. The lodge on the left, the chart in the center, the huntsman on the
  right: home, the map, and the person walking it. Taking the Hart pushes the
  epilogue onto the scaffold's modal stack.
-->
<script setup lang="ts">
import { inject, watch } from 'vue';
import { ThreePanelShell, modalStackKey } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { getChronicle, getHuntsman, getLodge, getWold } from '../modules';
import LodgePanel from './panels/LodgePanel.vue';
import ChartPanel from './panels/ChartPanel.vue';
import HuntsmanPanel from './panels/HuntsmanPanel.vue';
import Epilogue from './Epilogue.vue';

const chronicle = getChronicle();
const stack = inject(modalStackKey)!;
// The ending is terminal: taking the Hart stops every clock, so a won save
// reopens the epilogue on load.
watch(
  () => chronicle.won.value,
  (won) => {
    if (won) stack.push(Epilogue, {}, 'sm');
  },
  { immediate: true },
);

// Dev-only state hook for browser probes, on window.__game.
if (import.meta.env.DEV) {
  useDevHandle({ chronicle, lodge: getLodge(), wold: getWold(), huntsman: getHuntsman() });
}
</script>

<template>
  <ThreePanelShell left-width="minmax(270px, 300px)" right-width="minmax(290px, 340px)">
    <template #left>
      <LodgePanel />
    </template>
    <ChartPanel />
    <template #right>
      <HuntsmanPanel />
    </template>
  </ThreePanelShell>
</template>

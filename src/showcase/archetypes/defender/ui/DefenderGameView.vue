<!--
  DefenderGameView — the in-game subtree, mounted under the root's post-start
  frame. Between plots it is the garden: the plots, the gardener's level and
  the almanac. Inside a plot it is the board, until the gardener leaves it.
-->
<script setup lang="ts">
import { inject } from 'vue';
import type { Engine } from '@open-loop/engine';
import { SingleColumnShell } from '@/lib';
import { getGarden, getPlot } from '../modules';
import GardenScreen from './screens/GardenScreen.vue';
import PlotScreen from './screens/PlotScreen.vue';

const plot = getPlot();

// Dev-only state hook for browser probes: reads live module state without an
// `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__walledGarden = {
    garden: getGarden(),
    plot,
    engine,
    skip: (seconds: number) => engine.tickDriver.advanceTime(seconds),
  };
}
</script>

<template>
  <SingleColumnShell max-width="1120px">
    <PlotScreen v-if="plot.run.value" :run="plot.run.value" />
    <GardenScreen v-else />
  </SingleColumnShell>
</template>

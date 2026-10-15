<!--
  DefenderGameView — the in-game subtree, mounted under the root's post-start
  frame. Between plots it is the garden: the plots, the gardener's level and
  the almanac. Inside a plot it is the board, until the gardener leaves it.
-->
<script setup lang="ts">
import { SingleColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { getGarden, getPlot } from '../modules';
import GardenScreen from './screens/GardenScreen.vue';
import PlotScreen from './screens/PlotScreen.vue';

const plot = getPlot();

// Dev-only state hook for browser probes, on window.__game.
if (import.meta.env.DEV) useDevHandle({ garden: getGarden(), plot });
</script>

<template>
  <SingleColumnShell max-width="1120px">
    <PlotScreen v-if="plot.run.value" :run="plot.run.value" />
    <GardenScreen v-else />
  </SingleColumnShell>
</template>

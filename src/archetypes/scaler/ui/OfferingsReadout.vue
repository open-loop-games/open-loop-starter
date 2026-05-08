<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import HudChip from '@/ui/components/HudChip.vue';
import { getOfferings, getPrestigePoints } from '../modules';

const offerings = getOfferings();
const prestigePoints = getPrestigePoints();

// Show offerings once first prestige fires (one-way latch via cumulative tracker).
const show = computed(() => Decimal.gt(prestigePoints.cumulative?.value ?? 0, 0));
</script>

<template>
  <HudChip
    v-if="show"
    variant="muted"
  >
    <span>{{ format(offerings, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.4em">offerings</span>
  </HudChip>
</template>

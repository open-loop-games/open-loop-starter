<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import HudChip from '@/ui/components/HudChip.vue';
import { getPrestigePoints, getPrestigeShards } from '../modules';

const prestigePoints = getPrestigePoints();
const prestigeShards = getPrestigeShards();

const showPP = computed(
  () => Decimal.gt(prestigePoints.value, 0) || Decimal.gt(prestigeShards.value, 0),
);
const showShards = computed(() => Decimal.gt(prestigeShards.value, 0));
</script>

<template>
  <HudChip
    v-if="showPP"
    variant="muted"
  >
    <span>{{ format(prestigePoints, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.4em">PP</span>
  </HudChip>
  <HudChip
    v-if="showShards"
    variant="muted"
  >
    <span>{{ format(prestigeShards, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.4em">shards</span>
  </HudChip>
</template>

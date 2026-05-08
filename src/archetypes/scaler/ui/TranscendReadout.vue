<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import HudChip from '@/ui/components/HudChip.vue';
import { getTranscendPoints, getTranscendShards } from '../modules';

const transcendPoints = getTranscendPoints();
const transcendShards = getTranscendShards();

const showTP = computed(
  () => Decimal.gt(transcendPoints.value, 0) || Decimal.gt(transcendShards.value, 0),
);
const showShards = computed(() => Decimal.gt(transcendShards.value, 0));
</script>

<template>
  <HudChip
    v-if="showTP"
    variant="muted"
  >
    <span>{{ format(transcendPoints, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.4em">TP</span>
  </HudChip>
  <HudChip
    v-if="showShards"
    variant="muted"
  >
    <span>{{ format(transcendShards, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.4em">transcend shards</span>
  </HudChip>
</template>

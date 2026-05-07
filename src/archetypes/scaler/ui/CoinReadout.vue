<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import HudChip from '@/ui/components/HudChip.vue';
import { getCoinResource, getCoinProducers } from '../modules';

const coins = getCoinResource();
const producers = getCoinProducers();

const rate = computed(() => {
  let total = Decimal.dZero;
  for (const entry of producers.getAll()) {
    total = Decimal.add(
      total,
      Decimal.mul(entry.producer.computedRate.value, entry.producer.count.value),
    );
  }
  return total;
});
</script>

<template>
  <HudChip variant="big">
    <span>{{ format(coins, 0) }}</span>
    <span style="font-size: 0.7em; opacity: 0.7; margin-left: 0.5em">coins</span>
  </HudChip>
  <HudChip variant="muted">
    <span>+{{ format(rate, 2) }}/s</span>
  </HudChip>
</template>

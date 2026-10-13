<!--
  PlotResult — how the last plot went: held, lost or left, its score, whether
  it beat the plot's best, and the level it brought.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { PLOTS } from '../../data';
import type { PlotResult } from '../../modules';
import { inSentence, whole } from '../format';

const props = defineProps<{ result: PlotResult }>();

const name = computed(() => PLOTS.find((p) => p.id === props.result.plotId)?.displayName ?? '');
const headline = computed(() => {
  const r = props.result;
  if (r.outcome === 'held' && r.depth > 0)
    return `${name.value} held, and ${r.depth} ${r.depth === 1 ? 'night' : 'nights'} into the dark`;
  if (r.outcome === 'held') return `${name.value} held`;
  if (r.outcome === 'lost') return `${name.value} lost on night ${r.wavesCleared + 1}`;
  return `You left ${inSentence(name.value)} after ${r.wavesCleared} ${r.wavesCleared === 1 ? 'night' : 'nights'}`;
});
const gained = computed(() => props.result.levelAfter - props.result.levelBefore);
</script>

<template>
  <div class="wg-result" :class="result.outcome" role="status">
    <span class="wg-heading line">{{ headline }}</span>
    <span class="score">
      <span class="wg-num">{{ whole(result.score) }}</span> points
      <span v-if="result.newBest" class="best">a new best</span>
      <span v-else class="old">no better than your best</span>
    </span>
    <span v-if="gained > 0" class="up">
      Gardener level <span class="wg-num">{{ result.levelAfter }}</span
      >: {{ gained }} {{ gained === 1 ? 'note' : 'notes' }} for the almanac
    </span>
  </div>
</template>

<style scoped>
.wg-result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 20px;
  padding: 12px 18px;
  border-left: 4px solid var(--wg-twine-faint);
  background: var(--wg-loam-raised);
  animation: wg-settle 0.4s ease-out;
}
.wg-result.held {
  border-left-color: var(--wg-seedling);
}
.wg-result.lost {
  border-left-color: var(--wg-loss);
}
.line {
  font-size: 22px;
}
.score .wg-num {
  font-size: 20px;
}
.best {
  margin-left: 6px;
  color: var(--wg-seedling);
}
.old {
  margin-left: 6px;
  color: var(--wg-zinc);
}
.up {
  color: var(--wg-lantern);
}
</style>

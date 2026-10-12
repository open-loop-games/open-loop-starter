<!--
  LaunchPad — the A+C activity, and the one control designed to stop mattering.

  The share readout is not decoration. IDENTITY commits to a click that matters
  early and is dominated around tier 3, so the UI has to *say* that rather than
  leave the player wondering why the button stopped helping. Once the swarm
  outproduces a launch, the pad dims and names it.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { useFormatting } from '@/composables/useFormatting';

const props = defineProps<{
  /** Mass produced by one hand-launch, after the click chain. */
  yieldPerLaunch: DecimalSource;
  /** Swarm production per second — the thing the click is measured against. */
  totalRate: DecimalSource;
}>();

const emit = defineEmits<{ launch: [] }>();

const { format } = useFormatting();

/**
 * Share of production the click represents at one launch per second — the honest
 * ceiling, since a player cannot sustain more. Compared against the swarm's
 * continuous rate, so it falls as the ladder climbs.
 */
const share = computed(() => {
  const total = Decimal.add(props.totalRate, props.yieldPerLaunch);
  if (Decimal.lte(total, 0)) return 1;
  return Decimal.div(props.yieldPerLaunch, total).toNumber();
});

const dominated = computed(() => share.value < 0.1);

const shareLabel = computed(() => {
  const pct = share.value * 100;
  if (pct >= 1) return `${pct.toFixed(1)}% of production`;
  if (pct >= 0.0001) return `${pct.toFixed(4)}% of production`;
  return 'negligible';
});
</script>

<template>
  <div class="launch" :data-dominated="dominated">
    <Button class="launch__fire" @click="emit('launch')">Launch a probe</Button>
    <span class="launch__yield">+{{ format(yieldPerLaunch) }} mass · {{ shareLabel }}</span>
    <span v-if="dominated" class="launch__note">The swarm no longer needs you.</span>
  </div>
</template>

<style scoped>
.launch {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.launch[data-dominated='true'] {
  opacity: 0.42;
}
.launch__yield {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.launch__note {
  font-size: 10px;
  font-style: italic;
  opacity: 0.8;
}
</style>

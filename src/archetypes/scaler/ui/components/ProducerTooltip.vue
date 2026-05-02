<!--
  Per-row hover breakdown for a scaler producer. Wraps the row in a
  RichTooltip and surfaces the producer's modifier chain via the starter
  ChainBreakdown widget. Default-themed; forks restyle.

  Contribution / marginal / beat math from useRateBreakdown is intentionally
  omitted: cascading producers don't share a single tier-wide "total rate"
  (P1 produces coins, P2 produces P1s, etc.), so the % contribution
  framing doesn't translate. The chain breakdown alone is the intended
  surface — the same primitive that produced the sidebar dump, but
  per-row and on-demand.

  ChainBreakdown's `base` defaults to 1, which matches Synergism's
  per-producer multiplier-stack semantics — each producer's chain
  evaluates as a series of multipliers over an implicit ×1.
-->
<script setup lang="ts">
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';
import type { ProducerRow } from '../../composables/useProducers';

defineProps<{
  row: ProducerRow;
}>();
</script>

<template>
  <RichTooltip
    :open-delay="250"
    :close-delay="100"
    side="right"
  >
    <slot />
    <template #content>
      <ChainBreakdown
        :title="`${row.def.name} — output each`"
        :modifier="row.rateChain"
        unit=" /s"
      />
    </template>
  </RichTooltip>
</template>

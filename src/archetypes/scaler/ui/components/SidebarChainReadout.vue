<!--
  Sidebar modifier-chain readout. Follows the active tier from
  `useTierNav()` so the player sees the focal context's chain. Each
  rate-chain (one per producer) becomes an Accordion item; the chain's
  active factors live inside the panel.

  scaler.md § 6 prescribes Accordion when chain density grows past ~5
  factors; lifting it now (vs waiting) lets the slim-port slim-density
  case still benefit from the disclosure shape and gives forks a
  scaler-pattern adoption surface.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { ModifierChain } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import Accordion from '@/ui/components/Accordion.vue';
import {
  AntimatterRateChainsKey,
  PrestigeRateChainsKey,
  TranscendRateChainsKey,
} from '../../modules';
import { useTierNav } from '../../composables/useTierNav';
import { useChainBreakdown, type ChainBreakdown } from '../../composables/useChainBreakdown';
import type { Tier } from '../../data/types';

const { activeTier } = useTierNav();

// Bind one breakdown per chain at setup time (5 per tier × 3 tiers = 15
// stable computeds). Cheap: each is a thin walk over `chain.bindings()`,
// only re-evaluated when the chain it watches mutates. Calling
// useChainBreakdown inside a v-for inside a computed would create
// throwaway computeds on every tier switch — this map is the stable
// alternative.
const tierBreakdowns: Record<Tier, ComputedRef<ChainBreakdown>[]> = {
  antimatter: useModule(AntimatterRateChainsKey).map((c: ModifierChain) => useChainBreakdown(c)),
  prestige: useModule(PrestigeRateChainsKey).map((c: ModifierChain) => useChainBreakdown(c)),
  transcend: useModule(TranscendRateChainsKey).map((c: ModifierChain) => useChainBreakdown(c)),
};

const activeBreakdowns = computed(() => tierBreakdowns[activeTier.value]);

const items = computed(() =>
  activeBreakdowns.value.map((_b, idx) => ({
    value: `chain-${idx}`,
    label: `Producer ${idx + 1}`,
  })),
);

const expanded = computed<string[]>(() => items.value.map((i) => i.value));
</script>

<template>
  <section
    class="scaler-chain-readout"
    :data-tier="activeTier"
  >
    <header class="scaler-chain-readout__header">
      <h4>Modifier chain</h4>
      <span class="scaler-chain-readout__tier">{{ activeTier }}</span>
    </header>
    <Accordion
      v-if="items.length > 0"
      :items="items"
      type="multiple"
      :model-value="expanded"
    >
      <template
        v-for="(_item, idx) in items"
        :key="`panel-chain-${idx}`"
        #[`panel-chain-${idx}`]
      >
        <ul class="scaler-chain-readout__factors">
          <li
            v-for="factor in activeBreakdowns[idx].value.factors"
            :key="factor.id"
            class="scaler-chain-readout__factor"
            :data-active="factor.active"
            :data-bad="factor.isBad"
          >
            <span class="scaler-chain-readout__factor-text">{{ factor.text }}</span>
            <span class="scaler-chain-readout__factor-value">{{ factor.formattedValue }}</span>
          </li>
          <li
            v-if="activeBreakdowns[idx].value.factors.length === 0"
            class="scaler-chain-readout__empty"
          >
            No factors yet — buy a producer or upgrade.
          </li>
        </ul>
      </template>
    </Accordion>
    <p
      v-else
      class="scaler-chain-readout__empty"
    >
      No producers in this tier.
    </p>
  </section>
</template>

<style scoped>
.scaler-chain-readout {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.scaler-chain-readout__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.scaler-chain-readout__header h4 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}
.scaler-chain-readout__tier {
  font-size: 0.8em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.scaler-chain-readout__factors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.scaler-chain-readout__factor {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: 4px 0;
  border-bottom: 1px dotted var(--color-border);
  font-size: 0.85em;
}
.scaler-chain-readout__factor:last-child {
  border-bottom: none;
}
.scaler-chain-readout__factor[data-active='false'] {
  opacity: 0.5;
}
.scaler-chain-readout__factor[data-bad='true'] .scaler-chain-readout__factor-value {
  color: var(--color-danger, #c25656);
}
.scaler-chain-readout__factor-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.scaler-chain-readout__empty {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>

<!--
  Slot-driven base for any prestige tier (Antimatter / Prestige / Transcend).
  Composes useTier(config) once and lays out:
    [TierHeader]
    [ProducerGrid]
    [UpgradeGrid] (when upgrades or extra purchasables exist)
    [#extras slot] — Transcend fills with <ChallengeStrip /> + <AccBoostRow />

  Forks specialize tier presentation by:
    - editing tier-configs.ts (which keys, costume names)
    - filling #extras at the call site (tier-specific affordances)
  Tier-irrelevant slots simply render nothing — Antimatter has no upgrades
  category and no reset button, so those sections collapse out.
-->
<script setup lang="ts">
import type { TierConfig } from '../../composables/useTier';
import type { ExtraPurchasableRef, TierState } from '../../composables/useTier';
import { useTier } from '../../composables/useTier';
import TierHeader from './TierHeader.vue';
import ProducerGrid from './ProducerGrid.vue';
import UpgradeGrid from './UpgradeGrid.vue';

const props = defineProps<{
  config: TierConfig;
  /** Filter for which extra purchasables UpgradeGrid renders. Transcend
   *  passes a filter that hides AccBoost so its bespoke #extras slot
   *  owns it (cross-currency UI cue). */
  visibleExtras?: (ref: ExtraPurchasableRef) => boolean;
}>();

const tier: TierState = useTier(props.config);
</script>

<template>
  <div
    class="scaler-tier-panel"
    :data-tier="tier.id"
  >
    <TierHeader :tier="tier" />
    <div class="scaler-tier-panel__body">
      <ProducerGrid :rows="tier.producers.value" />
      <UpgradeGrid
        :tier="tier"
        :visible-extras="visibleExtras"
      />
      <slot
        name="extras"
        :tier="tier"
      />
    </div>
  </div>
</template>

<style scoped>
.scaler-tier-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.scaler-tier-panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  overflow: auto;
  min-height: 0;
  flex: 1;
}
</style>

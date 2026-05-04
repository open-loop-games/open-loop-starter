<!--
  Slot-driven base for any prestige tier (Antimatter / Prestige / Transcend).
  Composes useTier(display) once and lays out:
    [TierHeader]
    [ProducerGrid]
    [UpgradeGrid] (when upgrades exist)
    [#extras slot] — Transcend fills with <ChallengeStrip /> + <AccBoostRow />

  Forks specialize tier presentation by:
    - editing tier-configs.ts (titles, currency labels, externalUpgradeIds)
    - filling #extras at the call site (tier-specific affordances)
  Tier-irrelevant slots simply render nothing — Antimatter has no upgrades
  category external entries and no reset button, so those sections collapse
  out automatically.
-->
<script setup lang="ts">
import type { TierState } from '../../composables/useTier';
import { useTier } from '../../composables/useTier';
import type { TierDisplay } from '../tier-configs';
import TierHeader from './TierHeader.vue';
import ProducerGrid from './ProducerGrid.vue';
import UpgradeGrid from './UpgradeGrid.vue';

const props = defineProps<{
  display: TierDisplay;
}>();

const tier: TierState = useTier(props.display);
</script>

<template>
  <div
    class="scaler-tier-panel"
    :data-tier="tier.id"
  >
    <TierHeader :tier="tier" />
    <div class="scaler-tier-panel__body">
      <ProducerGrid :rows="tier.producers.value" />
      <UpgradeGrid :tier="tier" />
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

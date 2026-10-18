<!--
  ResearchPanel — the research tree: one-shot upgrades, each behind a prerequisite. An
  UpgradeGrid over `createPurchasableCard`, rendered through the `#card` slot as BuyCards,
  because a line priced in scrip and aether has no single cost the flat card can hold.
  A line the tree has not opened is listed with what it waits on, as on the training floors.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Purchasable } from '@open-loop/engine';
import { UpgradeGrid, createPurchasableCard, readPriceLines } from '@/ui/compositions';
import { RESEARCH, type ResearchDef } from '../../data/buildings';
import { getMatch } from '../../modules';
import { useHandledBy } from '../handled-by';
import BuyCard from './BuyCard.vue';

const { p } = getMatch();
const quartermaster = useHandledBy('quartermaster');
const listed = computed(() => true);

const cards = RESEARCH.map((def) => {
  const item = p.research.getPurchasable(def.id)!;
  return createPurchasableCard<{ def: ResearchDef; item: Purchasable }>(item, {
    displayName: def.name,
    description: def.blurb,
    unlocked: listed,
    extra: { def, item },
  });
});
</script>

<template>
  <section class="research" aria-label="Research">
    <h2 class="cc-title">Research</h2>
    <UpgradeGrid :cards="cards" reveal="inline">
      <template #card="{ card, description }">
        <BuyCard
          :title="card.displayName"
          :note="description"
          :prices="readPriceLines(card.extra!.item)"
          :can="card.canPurchase.value"
          :maxed="card.owned.value"
          :locked="card.extra!.item.visible.value ? undefined : card.extra!.def.requiresText"
          :automated="card.owned.value ? undefined : quartermaster"
          @buy="card.purchase()"
        />
      </template>
    </UpgradeGrid>
  </section>
</template>

<style scoped>
.research {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
</style>

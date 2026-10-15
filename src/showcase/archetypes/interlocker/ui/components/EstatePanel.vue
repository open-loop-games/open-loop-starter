<!--
  EstatePanel — the buildings: four raw producers and the three that serve the works, each
  a geometric ladder priced in several stocks. Adopts ProducerList through its `#row`
  slot, because a multi-stock price is a shape the flat row contract cannot hold; the
  price is read back from the engine by CostLine. A building a patent has not opened is
  pencilled in, with the patent it waits on.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import type { ProducerRowData } from '@/ui/compositions';
import {
  BUILDINGS,
  RESEARCH,
  RESOURCES,
  STEAM_PER_COAL,
  WAREHOUSE_CAP_STEP,
  WORKERS_PER_CITE,
  type BuildingDef,
} from '../../data';
import { getWorks } from '../../modules';
import CostLine from './CostLine.vue';

const works = getWorks();
const patentName = Object.fromEntries(RESEARCH.map((r) => [r.id, r.name]));
const resName = Object.fromEntries(RESOURCES.map((r) => [r.id, r.name.toLowerCase()]));

interface EstateExtra {
  def: BuildingDef;
  visible: () => boolean;
  does: () => string;
}

const rows: ProducerRowData<EstateExtra>[] = BUILDINGS.map((def) => {
  const p = works.buildings.getPurchasable(def.id)!;
  return {
    id: def.id,
    displayName: def.name,
    count: p.count,
    displayRate: computed(() => works.yieldEach(def.id)),
    cost: () => 0,
    canPurchase: () => p.canPurchase.value,
    maxAffordable: computed(() => (p.canPurchase.value ? 1 : 0)),
    purchase: () => p.purchase(1),
    extra: {
      def,
      visible: () => p.visible.value,
      does: () =>
        def.yields
          ? `+${works.yieldEach(def.id).toFixed(2)} ${resName[def.yields]} a second each`
          : def.id === 'warehouse'
            ? `every bin +${Math.round(WAREHOUSE_CAP_STEP * 100)}% of its base`
            : def.id === 'boiler'
              ? `${STEAM_PER_COAL} steam from each coal it burns`
              : `+${WORKERS_PER_CITE} compagnons`,
    },
  };
});
</script>

<template>
  <ProducerList :rows="rows" cost-label="" bulk-mode-source="none" class="ae-estate">
    <template #header />
    <template #row="{ row, purchase }">
      <article class="plate" :class="{ can: row.canPurchase(1), sealed: !row.extra!.visible() }">
        <template v-if="row.extra!.visible()">
          <header>
            <h3 class="ae-lettering">{{ row.displayName }}</h3>
            <span class="owned ae-figure">{{ row.count.value }}</span>
          </header>
          <p class="blurb">
            {{ row.extra!.def.blurb }}
            <span class="does ae-figure">{{ row.extra!.does() }}</span>
          </p>
          <footer>
            <CostLine :item="works.buildings.getPurchasable(row.id)!" />
            <Button
              class="ae-act"
              :class="{ can: row.canPurchase(1) }"
              :disabled="!row.canPurchase(1)"
              @click="purchase()"
              >Raise</Button
            >
          </footer>
        </template>
        <template v-else>
          <h3 class="ae-lettering">{{ row.displayName }}</h3>
          <p class="blurb sealed-note">
            Not yet drawn — needs {{ patentName[row.extra!.def.opensWith!] }}
          </p>
        </template>
      </article>
    </template>
  </ProducerList>
</template>

<style scoped>
.plate {
  flex: 1;
  border: 1px solid var(--ae-cyanotype-rule);
  background: var(--ae-cyanotype);
  padding: 10px 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: ae-inked 0.5s ease-out;
}
.plate.can {
  border-color: var(--ae-brass-dim);
}
.plate.sealed {
  border-style: dashed;
  background: transparent;
  opacity: 0.6;
}
header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
h3 {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ae-chalk);
}
.owned {
  font-size: 1.5rem;
  color: var(--ae-chalk);
}
.blurb {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ae-drafting-line);
}
.does {
  display: block;
  color: var(--ae-drafting-line-faint);
  font-style: italic;
}
.sealed-note {
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}
</style>

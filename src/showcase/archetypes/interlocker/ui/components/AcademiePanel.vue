<!--
  AcademiePanel — the patents, drawn as the prerequisite graph: one column per depth, a
  patent one column right of its deepest prerequisite. Each column adopts UpgradeGrid
  through its `#card` slot, since a patent's price is several stocks and its edges are
  shown on the card. An edge not yet held is vermilion; a held patent is stamped.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, createPurchasableCard } from '@/ui/compositions';
import { RESEARCH, type ResearchDef, type ResearchId } from '../../data';
import { getWorks } from '../../modules';
import CostLine from './CostLine.vue';

const works = getWorks();
const names = Object.fromEntries(RESEARCH.map((r) => [r.id, r.name])) as Record<ResearchId, string>;

const depth = {} as Record<ResearchId, number>;
for (const r of RESEARCH)
  depth[r.id] = r.requires.length ? Math.max(...r.requires.map((q) => depth[q])) + 1 : 0;
const HEADS = ['Foundations', 'Concessions', 'Processes', 'Machines', 'Flight'];

interface PatentExtra {
  def: ResearchDef;
  edges: () => { id: ResearchId; name: string; held: boolean }[];
  open: () => boolean;
}

function card(def: ResearchDef) {
  const edges = () =>
    def.requires.map((q) => ({ id: q, name: names[q], held: works.researched(q).value }));
  return createPurchasableCard<PatentExtra>(works.research.getPurchasable(def.id)!, {
    displayName: def.name,
    description: def.blurb,
    extra: { def, edges, open: () => edges().every((e) => e.held) },
  });
}

const columns = computed(() =>
  HEADS.map((head, c) => ({
    head,
    cards: RESEARCH.filter((r) => depth[r.id] === c).map(card),
  })).filter((col) => col.cards.length),
);
</script>

<template>
  <div class="ae-academie">
    <section v-for="col in columns" :key="col.head" class="column">
      <h3 class="ae-section-head">{{ col.head }}</h3>
      <UpgradeGrid :cards="col.cards" :columns="1" reveal="inline">
        <template #card="{ card: c }">
          <article
            class="patent"
            :class="{
              held: c.owned.value,
              can: c.canPurchase.value,
              sealed: !c.extra!.open() && !c.owned.value,
            }"
          >
            <header>
              <span class="name">{{ c.displayName }}</span>
              <span class="year ae-figure">{{ c.extra!.def.year }}</span>
            </header>
            <p class="blurb">{{ c.description }}</p>
            <ul v-if="c.extra!.def.requires.length" class="requires">
              <li v-for="e in c.extra!.edges()" :key="e.id" :class="{ held: e.held }">
                {{ e.name }}
              </li>
            </ul>
            <footer v-if="!c.owned.value">
              <template v-if="c.extra!.open()">
                <CostLine :item="works.research.getPurchasable(c.id)!" />
                <Button
                  class="ae-act"
                  :class="{ can: c.canPurchase.value }"
                  :disabled="!c.canPurchase.value"
                  @click="c.purchase()"
                  >Patent</Button
                >
              </template>
            </footer>
            <div v-else class="ae-stamp">Patented</div>
          </article>
        </template>
      </UpgradeGrid>
    </section>
  </div>
</template>

<style scoped>
.ae-academie {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 14px;
  align-items: start;
}
.patent {
  flex: 1;
  border: 1px solid var(--ae-cyanotype-rule);
  background: var(--ae-cyanotype);
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  animation: ae-inked 0.5s ease-out;
}
.patent.can {
  border-color: var(--ae-brass-dim);
}
.patent.sealed {
  border-style: dashed;
  background: transparent;
  opacity: 0.55;
}
.patent.held {
  background: transparent;
}
header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.name {
  color: var(--ae-chalk);
}
.held .name {
  color: var(--ae-drafting-line);
}
.year {
  color: var(--ae-drafting-line-faint);
  font-size: 0.82rem;
}
.blurb {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ae-drafting-line);
}
.held .blurb {
  color: var(--ae-drafting-line-faint);
}
.requires {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--ae-vermilion);
}
.requires li::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border: 1px solid currentColor;
  vertical-align: 1px;
}
.requires li.held {
  color: var(--ae-drafting-line-faint);
}
.requires li.held::before {
  background: var(--ae-verdigris);
  border-color: var(--ae-verdigris);
}
footer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
</style>

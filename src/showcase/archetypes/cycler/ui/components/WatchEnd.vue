<!--
  WatchEnd — between watches. The logbook's account of the watch just ended, the keeper's
  knowledge on starter's `UpgradeGrid` (each entry levels, so the card shows its level and
  the next price), the postings the charters have opened, and taking the next one. A watch
  under the relief ends in the career's close: the light held, or the lesser close, which
  the Flannans can be taken again to better.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import { ANCHORS, KNOWLEDGE, POSTINGS, type KnowledgeDef } from '../../data';
import { getLogbook, getWatch } from '../../modules';
import { n } from '../format';

const logbook = getLogbook();
const watch = getWatch();
const last = computed(() => logbook.lastWatch.value);
const lastPosting = computed(() => POSTINGS.find((p) => p.id === last.value?.posting)?.name);
const ending = computed(() => logbook.ending.value);

interface Shelf {
  def: KnowledgeDef;
  /** What must be learned first, while it is not. */
  gated: string | null;
}

const all: UpgradeCardData<Shelf>[] = KNOWLEDGE.map((def) => {
  const p = logbook.knowledge.getPurchasable(def.id)!;
  return {
    id: def.id,
    displayName: def.name,
    description: def.blurb,
    cost: computed(() => p.getCost(1)),
    costLabel: 'entries',
    canPurchase: p.canPurchase,
    owned: p.maxed,
    count: p.count,
    purchase: () => p.purchase(1),
    extra: {
      def,
      get gated() {
        const req = def.requires;
        if (!req || logbook.level(req.id) >= req.levels) return null;
        return `needs ${KNOWLEDGE.find((k) => k.id === req.id)!.name} ${req.levels}`;
      },
    },
  };
});
// A charter, once bought, is spent: its posting shows below instead.
const cards = computed(() => all.filter((c) => !(c.extra!.def.limit === 1 && c.owned.value)));

const postings = computed(() =>
  POSTINGS.map((p) => ({
    def: p,
    open: logbook.posting.canSelect(p.id) || logbook.posting.isSelected(p.id),
    chosen: logbook.posting.isSelected(p.id),
  })),
);
</script>

<template>
  <div class="watch-end" role="region" aria-label="Between watches">
    <div class="page">
      <div v-if="ending !== 'none'" class="ending" :class="ending">
        <template v-if="ending === 'held'">
          The light held through the last gale, and the relief came to the Flannans. The Board's log
          closes here; the rock is yours to keep as long as you like.
        </template>
        <template v-else>
          The light went out the night the relief came. The log records it; the Flannans can be
          taken again.
        </template>
      </div>
      <header v-if="last">
        <div class="kicker">From the logbook</div>
        <h1 v-if="last.relief === 'held'">
          The light at {{ lastPosting }} held through the final gale, {{ last.nights }} nights kept.
        </h1>
        <h1 v-else-if="last.relief === 'lost'">
          The light at {{ lastPosting }} went out under the final gale, on night
          {{ last.nights + 1 }}.
        </h1>
        <h1 v-else>
          The light at {{ lastPosting }} went dark after {{ last.nights }}
          {{ last.nights === 1 ? 'night' : 'nights' }}.
        </h1>
        <p class="summary num">
          Weathered {{ n(last.weathered) }} force · gathered {{ n(last.gathered) }} salvage ·
          <strong>{{ last.entries }} entries</strong> written
        </p>
      </header>

      <section>
        <h2 class="sk-title">
          Keeper's knowledge
          <span class="spend num">{{ n(logbook.entries.value) }} entries to spend</span>
        </h2>
        <UpgradeGrid :cards="cards" :columns="3" reveal="inline">
          <template #card="{ card }">
            <Button
              class="sk-control book"
              :class="{ afford: card.canPurchase.value, maxed: card.owned.value }"
              :disabled="!card.canPurchase.value"
              :data-knowledge="card.id"
              :repeat="false"
              @click="card.purchase()"
            >
              <span class="title"
                >{{ card.displayName
                }}<span
                  v-if="toNumber(card.count!.value) && card.extra!.def.limit > 1"
                  class="num lvl"
                >
                  {{ toNumber(card.count!.value) }}</span
                ></span
              >
              <span class="blurb">{{ card.description }}</span>
              <span class="price num">
                <template v-if="card.owned.value">learned</template>
                <template v-else-if="card.extra!.gated">{{ card.extra!.gated }}</template>
                <template v-else>{{ n(card.cost.value) }} entries</template>
              </span>
            </Button>
          </template>
        </UpgradeGrid>
      </section>

      <section>
        <h2 class="sk-title">Next posting</h2>
        <div class="postings">
          <Button
            v-for="p in postings"
            :key="p.def.id"
            class="sk-control posting"
            :class="{ on: p.chosen, closed: !p.open }"
            :disabled="!p.open"
            :data-posting="p.def.id"
            :repeat="false"
            @click="logbook.posting.select(p.def.id)"
          >
            <span class="title">{{ p.def.name }}</span>
            <span class="blurb">{{ p.def.blurb }}</span>
            <span class="price num"
              >storms ×{{ p.def.g }} a night ·
              {{ p.def.wind === 'veering' ? 'veering winds' : 'always from the west'
              }}<template v-if="p.def.wrack !== 1"> · wrack ×{{ p.def.wrack }}</template
              ><template v-if="p.def.closing">
                · storms set for {{ ANCHORS.closingStone }} levels of Dressed stone</template
              ></span
            >
          </Button>
        </div>
      </section>

      <Button class="take" data-testid="take-posting" :repeat="false" @click="watch.startWatch()">
        Take the posting
      </Button>
    </div>
  </div>
</template>

<style scoped>
.watch-end {
  display: grid;
  place-items: start center;
  padding: 24px 12px;
  animation: fade 0.8s ease-out;
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
.page {
  width: min(880px, 100%);
  padding: 26px 30px;
  background: linear-gradient(180deg, #1d2629, #161d20);
  border: 1px solid rgba(184, 149, 90, 0.4);
  border-radius: 6px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}
.ending {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 4px;
  font-family: var(--sk-chart);
  font-size: 15px;
  line-height: 1.45;
}
.ending.held {
  border: 1px solid var(--sk-lamp);
  background: var(--sk-lamp-soft);
  color: var(--sk-whitewash);
  box-shadow: 0 0 30px var(--sk-lamp-glow);
}
.ending.lesser {
  border: 1px solid rgba(196, 87, 62, 0.6);
  background: var(--sk-rust-soft);
  color: #f0b5a6;
}
.kicker {
  font-family: var(--sk-chart);
  color: var(--sk-brass);
  font-size: 13px;
}
h1 {
  margin: 4px 0 6px;
  font-family: var(--sk-chart);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.3;
  color: var(--sk-whitewash);
}
.summary {
  margin: 0 0 18px;
  opacity: 0.85;
}
.summary strong {
  color: var(--sk-lamp);
  font-weight: 600;
}
section {
  margin-top: 18px;
}
.sk-title {
  border-bottom: 1px solid var(--sk-rule);
  padding-bottom: 4px;
  font-size: 15px;
}
.spend {
  font-family: var(--sk-log);
  font-size: 14px;
  color: var(--sk-lamp);
}
.postings {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.book,
.posting {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  height: 100%;
  text-align: left;
  padding: 10px;
  background: rgba(11, 19, 29, 0.5);
  color: var(--sk-foam);
}
.title {
  font-family: var(--sk-chart);
  font-size: 13px;
}
.lvl {
  margin-left: 6px;
  color: var(--sk-brass);
}
.blurb {
  font-size: 13px;
  opacity: 0.8;
}
.price {
  font-size: 13px;
  color: var(--sk-overcast);
  margin-top: auto;
}
.book.afford .price {
  color: var(--sk-lamp);
}
.book.maxed {
  opacity: 0.6;
}
.posting.closed {
  opacity: 0.45;
}
.take {
  display: block;
  margin: 22px 0 0 auto;
  padding: 10px 22px;
  font-family: var(--sk-chart);
  font-size: 15px;
  color: #1b1408;
  background: var(--sk-lamp);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 0 24px var(--sk-lamp-glow);
}
</style>

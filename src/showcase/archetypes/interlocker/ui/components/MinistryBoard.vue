<!--
  MinistryBoard — the Ministry of War's orders, pinned above the telegraph so a standing
  order is never a tab away from its lapse. It is not drawn until the works have shown at
  an Exposition, when the Ministry starts to offer. Each order lists its lines, consigned
  against asked, and what the bins hold now; Consign sends what they hold. The dossier is
  every completed order's score, which the jury reads beside the exhibit.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { RESOURCES, type ResourceId } from '../../data';
import { getMinistry, getWorks } from '../../modules';
import { countdown, stock } from '../format';

/** Seconds before a lapse that an order's clock turns vermilion. */
const URGENT = 30;

const ministry = getMinistry();
const works = getWorks();
const name = Object.fromEntries(RESOURCES.map((r) => [r.id, r.name])) as Record<ResourceId, string>;

const open = computed(() => Number.isFinite(ministry.nextOfferIn.value));

const orders = computed(() =>
  ministry.orders.value.map((o) => {
    const left = ministry.lapsesIn(o);
    return {
      id: o.id,
      left,
      urgent: left < URGENT,
      can: ministry.canDeliver(o.id),
      lines: (Object.entries(o.lines) as [ResourceId, number][]).map(([r, asked]) => {
        const filled = o.filled[r] ?? 0;
        return {
          r,
          name: name[r],
          asked,
          filled,
          held: Math.floor(toNumber(works.res[r].value)),
          done: filled >= asked,
        };
      }),
    };
  }),
);
</script>

<template>
  <section v-if="open" class="ae-ministry" aria-label="Ministry of War">
    <h2 class="ae-section-head">Ministry of War</h2>
    <div class="dossier">
      <span>Dossier</span>
      <span class="ae-figure score">{{ stock(ministry.dossier.value) }}</span>
      <span class="next ae-figure">next order {{ countdown(ministry.nextOfferIn.value) }}</span>
    </div>
    <ol>
      <li v-for="o in orders" :key="o.id" class="order" :class="{ can: o.can }">
        <header>
          <span class="no ae-lettering"
            >Order Nº <span class="ae-figure">{{ o.id }}</span></span
          >
          <span class="lapse ae-figure" :class="{ urgent: o.urgent }"
            >lapses {{ countdown(o.left) }}</span
          >
        </header>
        <div v-for="l in o.lines" :key="l.r" class="line" :class="{ done: l.done }">
          <span class="good">{{ l.name }}</span>
          <span class="ae-figure tally"
            >{{ l.filled }}<span class="of">/{{ l.asked }}</span></span
          >
          <span class="ae-figure held">{{ l.done ? 'sent' : `${l.held} held` }}</span>
          <ProgressBar class="ae-ministry__line" :value="l.filled" :max="l.asked" />
        </div>
        <Button
          class="ae-act consign"
          :class="{ can: o.can }"
          :disabled="!o.can"
          @click="ministry.deliver(o.id)"
          >Consign</Button
        >
      </li>
      <li v-if="!orders.length" class="quiet">No order stands.</li>
    </ol>
  </section>
</template>

<style scoped>
.ae-ministry {
  margin-bottom: 16px;
  animation: ae-inked 0.6s ease-out;
}
.dossier {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.86rem;
  color: var(--ae-drafting-line-faint);
}
.score {
  font-size: 1.1rem;
  color: var(--ae-chalk);
}
.next {
  margin-left: auto;
  font-size: 0.8rem;
}
ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.order {
  border: 1px solid var(--ae-cyanotype-rule);
  background: var(--ae-cyanotype);
  padding: 7px 9px 8px;
  display: grid;
  gap: 4px;
  animation: ae-inked 0.5s ease-out;
}
.order.can {
  border-color: var(--ae-brass-dim);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.no {
  font-size: 11px;
  color: var(--ae-chalk);
}
.lapse {
  font-size: 0.8rem;
  color: var(--ae-slate);
}
.lapse.urgent {
  color: var(--ae-vermilion);
}
.line {
  display: grid;
  grid-template-columns: 1fr auto 4.4rem;
  grid-template-rows: auto 2px;
  column-gap: 6px;
  align-items: baseline;
  font-size: 0.86rem;
}
.good {
  color: var(--ae-drafting-line);
}
.tally {
  color: var(--ae-chalk);
  text-align: right;
}
.of,
.held {
  color: var(--ae-drafting-line-faint);
  font-size: 0.85em;
}
.held {
  text-align: right;
}
.done .good,
.done .tally {
  color: var(--ae-verdigris);
}
.ae-ministry__line {
  grid-column: 1 / -1;
  margin-top: 2px;
  --progress-bar-track: var(--ae-cyanotype-rule);
  --progress-bar-fill: var(--ae-brass-dim);
  --progress-bar-radius: 0;
  --progress-bar-height: 2px;
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-fill-full: var(--progress-bar-fill);
  --progress-bar-track-empty: var(--progress-bar-track);
  --progress-bar-transition: none;
}
.done .ae-ministry__line {
  --progress-bar-fill: var(--ae-verdigris);
}
.consign {
  justify-self: end;
  margin-top: 2px;
  padding: 2px 11px;
}
.quiet {
  font-style: italic;
  font-size: 0.86rem;
  color: var(--ae-drafting-line-faint);
}
</style>

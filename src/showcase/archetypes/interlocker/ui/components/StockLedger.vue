<!--
  StockLedger — every stock against its bin, grouped raw, worked and the hangar. Each
  row is the ResourceReadout shape (value, net rate, capacity), rendered as a ledger
  line with a hairline bin gauge under it. A stock the works have never made stays
  pencilled in; a full bin reads FULL in aluminium.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import type { ResourceReadout } from '@/ui/compositions';
import { RESOURCES, type ResourceDef } from '../../data';
import { getWorks } from '../../modules';
import { rate, stock } from '../format';

const works = getWorks();

const groups: { title: string; stage: ResourceDef['stage'] }[] = [
  { title: 'Raw stock', stage: 'raw' },
  { title: 'Worked stock', stage: 'worked' },
  { title: 'Hangar', stage: 'finished' },
];

const readouts: (ResourceReadout & { stage: ResourceDef['stage'] })[] = RESOURCES.map((def) => ({
  id: def.id,
  label: def.name,
  stage: def.stage,
  value: works.res[def.id],
  rate: computed(() => works.net[def.id]),
  capacity: works.cap[def.id],
}));

const rows = computed(() =>
  readouts.map((r) => {
    const value = toNumber(r.value.value);
    const cap = toNumber(r.capacity!.value);
    const net = toNumber(r.rate!.value);
    return {
      r,
      value,
      cap,
      net,
      fill: Math.min(1, value / cap),
      // Within half a percent: rations nibble a pinned larder just under its lid every tick.
      full: value >= cap * 0.995,
      seen: value > 0 || toNumber(works.res[r.id as ResourceDef['id']].best!.value) > 0,
    };
  }),
);
</script>

<template>
  <div class="ae-ledger" aria-label="Stock ledger">
    <section v-for="g in groups" :key="g.stage">
      <h2 class="ae-section-head">{{ g.title }}</h2>
      <div
        v-for="row in rows.filter((x) => x.r.stage === g.stage)"
        :key="row.r.id"
        class="row"
        :class="{
          full: row.full,
          unseen: !row.seen,
          falling: row.net < -0.005,
          rising: row.net > 0.005,
        }"
      >
        <span class="name">{{ row.r.label }}</span>
        <span class="amount ae-figure"
          >{{ stock(row.value) }}<span class="cap">/{{ stock(row.cap) }}</span></span
        >
        <span class="net ae-figure">{{
          row.full && row.net >= -0.005 ? 'full' : rate(row.net)
        }}</span>
        <span class="bin" aria-hidden="true"
          ><span class="bin-fill" :style="{ transform: `scaleX(${row.fill})` }"
        /></span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ae-ledger section + section {
  margin-top: 16px;
}
.row {
  display: grid;
  grid-template-columns: 1fr minmax(5.6rem, auto) 3.6rem;
  grid-template-rows: auto 3px;
  column-gap: 0.6rem;
  align-items: baseline;
  padding: 4px 0 5px;
}
.name {
  color: var(--ae-chalk);
}
.amount {
  text-align: right;
  color: var(--ae-chalk);
}
.cap {
  color: var(--ae-drafting-line-faint);
  font-size: 0.8em;
}
.net {
  text-align: right;
  font-size: 0.85rem;
  color: var(--ae-slate);
}
.rising .net {
  color: var(--ae-verdigris);
}
.falling .net {
  color: var(--ae-vermilion);
}
.full .net {
  color: var(--ae-aluminium);
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.72rem;
}
.bin {
  grid-column: 1 / -1;
  height: 2px;
  margin-top: 3px;
  background: var(--ae-cyanotype-rule);
  overflow: hidden;
}
.bin-fill {
  display: block;
  height: 100%;
  background: var(--ae-drafting-line-faint);
  transform-origin: left;
  transition: transform 0.4s linear;
}
.full .bin-fill {
  background: var(--ae-aluminium);
}
.unseen {
  opacity: 0.35;
}
</style>

<!--
  LodgePanel — home: the stores, the yard and the outfitter. The stores adopt
  the `ResourceReadout` shape and render it as a ledger; the yard is a
  `ProducerList` and the outfitter an `UpgradeGrid`, each rendering its own row
  through the composition's slot. Their prices are paid in different stores,
  so each row carries its currency in `extra`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber, type DecimalSource, type Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import {
  ProducerList,
  UpgradeGrid,
  createProducerRow,
  createPurchasableCard,
  createPurchasableRow,
  readPriceLines,
  type ResourceReadout,
} from '@/ui/compositions';
import { ANCHORS, GEAR, PRODUCERS, type Currency, type GearDef } from '../../data';
import { getLodge, getWold, type LodgeStore } from '../../modules';
import { formatGrouped as fmt } from '@/composables/useFormatting';

const lodge = getLodge();
const wold = getWold();
const n = (v: DecimalSource) => toNumber(v);

// === STORES ===

const STORE_ORDER: LodgeStore[] = ['jerky', 'meat', 'hide', 'antler', 'wood'];
const rates = computed<Record<LodgeStore, number>>(() => {
  const smoke = lodge.smokeRate.value;
  return {
    jerky: smoke,
    meat: n(lodge.producers.getTotalRate(lodge.stores.meat)) - smoke / ANCHORS.jerkyPerMeat,
    wood: n(lodge.producers.getTotalRate(lodge.stores.wood)) - smoke * lodge.woodPerJerky.value,
    hide: 0,
    antler: 0,
  };
});
const readouts: ResourceReadout[] = STORE_ORDER.map((id) => ({
  id,
  label: lodge.stores[id].displayName ?? id,
  value: lodge.stores[id],
  rate: computed(() => rates.value[id]),
}));
const rateText = (r: number) =>
  Math.abs(r) > 0.005 ? `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}/s` : '';

// === PRICES ===

interface Chip {
  k: Currency;
  v: number;
  ok: boolean;
}
/** The engine's price for the next unit, one chip per store that pays. */
const chips = (p: Purchasable): Chip[] =>
  readPriceLines(p)
    .filter((line) => n(line.amount) > 0)
    .map((line) => ({
      k: STORE_ORDER.find((k) => lodge.stores[k] === line.resource)! as Currency,
      v: n(line.amount),
      ok: !line.short,
    }));

// === THE YARD ===

interface YardExtra {
  blurb: string;
  chips: () => Chip[];
}

const rack = lodge.racks;
// One at a time, through the lodge's own verbs; the rate shown is per unit.
const yard = [
  createPurchasableRow<YardExtra>(rack, {
    displayName: 'Smoke rack',
    rate: computed(() => lodge.rackJerkyRate.value),
    purchase: () => lodge.buyRack(),
    extra: { blurb: 'Meat and wood into jerky', chips: () => chips(rack) },
  }),
  ...PRODUCERS.map((def) => {
    const p = lodge.producers.getProducer(def.id)!;
    return createProducerRow<YardExtra>(p, {
      displayName: def.displayName,
      rate: p.computedRate,
      purchase: () => lodge.buyProducer(def.id),
      extra: { blurb: def.blurb, chips: () => chips(p.repeatable!) },
    });
  }),
];
const yardUnit = (id: string) => (id === 'rack' ? 'jerky' : id === 'snare' ? 'meat' : 'wood');

// === THE OUTFITTER ===

/** Gear shows itself once the country that wants it has been sighted. */
const sighted: Partial<Record<GearDef['id'], string>> = {
  waders: 'marsh',
  snowshoes: 'snow',
  lantern: 'deepwood',
  hounds: 'forest',
};

interface GearExtra {
  def: GearDef;
  level: () => number;
  chips: () => Chip[];
}

const outfitter = computed(() =>
  GEAR.filter((def) => {
    const zone = sighted[def.id];
    return zone == null || wold.zones.isUnlocked(zone);
  }).map((def) => {
    const p = lodge.gear.getPurchasable(def.id)!;
    const level = () => lodge.gearLevel(def.id);
    // Several stores pay, so the card carries no single price; the slot shows the chips.
    return createPurchasableCard<GearExtra>(p, {
      displayName: def.displayName,
      description: def.blurb,
      count: p.count,
      purchase: () => lodge.buyGear(def.id),
      extra: { def, level, chips: () => (p.maxed.value ? [] : chips(p)) },
    });
  }),
);
</script>

<template>
  <div class="lodge">
    <section class="sp-section">
      <h2>The lodge stores</h2>
      <ul class="stores">
        <li v-for="r in readouts" :key="r.id">
          <span class="name">{{ r.label }}</span>
          <span class="val sp-num">{{ fmt(r.value.value) }}</span>
          <span
            class="rate sp-num"
            :class="{ up: n(r.rate!.value) > 0.005, down: n(r.rate!.value) < -0.005 }"
          >
            {{ rateText(n(r.rate!.value)) }}
          </span>
        </li>
      </ul>
    </section>

    <section class="sp-section">
      <h2>Smokehouse &amp; yard</h2>
      <ProducerList :rows="yard" cost-label="" bulk-mode-source="none">
        <template #row="{ row, purchase }">
          <Button
            repeat
            class="sp-buy"
            :class="{ can: row.canPurchase(1) }"
            :disabled="!row.canPurchase(1)"
            @click="purchase()"
          >
            <span class="title">
              {{ row.displayName }} <span class="lvl sp-num">{{ fmt(row.count.value) }}</span>
            </span>
            <span class="blurb">
              {{ row.extra!.blurb }},
              <span class="sp-num"
                >+{{ n(row.displayRate.value).toFixed(2) }} {{ yardUnit(row.id) }}/s each</span
              >
            </span>
            <span class="chips">
              <span
                v-for="c in row.extra!.chips()"
                :key="c.k"
                class="chip sp-num"
                :class="{ ok: c.ok }"
                >{{ fmt(c.v) }} {{ c.k }}</span
              >
            </span>
          </Button>
        </template>
      </ProducerList>
    </section>

    <section class="sp-section">
      <h2>Outfitter</h2>
      <UpgradeGrid :cards="outfitter" :columns="1" reveal="inline">
        <template #card="{ card }">
          <Button
            class="sp-buy sp-reveal"
            :class="{ can: card.canPurchase.value, maxed: card.owned.value }"
            :disabled="!card.canPurchase.value"
            @click="card.purchase()"
          >
            <span class="title">
              {{ card.displayName }}
              <span v-if="card.extra!.def.limit > 1" class="lvl sp-num"
                >{{ card.extra!.level() }}/{{ card.extra!.def.limit }}</span
              >
              <span v-else-if="card.owned.value" class="lvl">owned</span>
            </span>
            <span class="blurb">{{ card.description }}</span>
            <span class="chips">
              <span
                v-for="c in card.extra!.chips()"
                :key="c.k"
                class="chip sp-num"
                :class="{ ok: c.ok }"
                >{{ fmt(c.v) }} {{ c.k }}</span
              >
            </span>
          </Button>
        </template>
      </UpgradeGrid>
    </section>
  </div>
</template>

<style scoped>
.lodge {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.stores {
  list-style: none;
  margin: 0;
  padding: 0;
}
.stores li {
  display: grid;
  grid-template-columns: 1fr 70px 70px;
  align-items: baseline;
  padding: 2px 0;
}
.name {
  color: var(--sp-birch-dim);
}
.val {
  text-align: right;
  font-size: 17px;
  color: var(--sp-birch);
}
.rate {
  text-align: right;
  font-size: 12px;
  color: var(--sp-ash);
}
.rate.up {
  color: var(--sp-moss);
}
.rate.down {
  color: var(--sp-rust);
}
.lodge :deep(.producer-list__header) {
  display: none;
}
.lodge :deep(.producer-list__rows),
.lodge :deep(.upgrade-grid) {
  gap: 6px;
}
</style>

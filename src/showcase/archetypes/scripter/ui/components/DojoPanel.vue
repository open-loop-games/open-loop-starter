<!--
  DojoPanel — Ki and what it buys, on starter's `ProducerList`: students who meditate Ki,
  senpai who train more of them, and Temper, which hardens the fist. The scroll's purchase
  lines buy these on the student's beats; the buttons here are the sensei's own hand,
  the same purchase.
-->
<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { ProducerList, type ProducerRowData } from '@/ui/compositions';
import { getDojo, getKata } from '../../modules';
import { fmt, fmtRate } from '../format';

const dojo = getDojo();
const kata = getKata();

interface Rung {
  /** What the row's figure says under the count. */
  note: ComputedRef<string>;
  verb: string;
}

function row(
  id: string,
  displayName: string,
  p: Purchasable,
  count: ComputedRef<DecimalSource>,
  rate: ComputedRef<DecimalSource>,
  note: ComputedRef<string>,
  verb: string,
  unlocked: ComputedRef<boolean>,
): ProducerRowData<Rung> {
  return {
    id,
    displayName,
    count,
    displayRate: rate,
    cost: (n) => p.getCost(n),
    canPurchase: (n) => Decimal.lte(p.getCost(n), dojo.ki.value),
    maxAffordable: p.countToPurchase,
    purchase: (n) => p.purchase(n),
    unlocked,
    extra: { note, verb },
  };
}

const student = dojo.producers.getEntry('student')!.producer;
const senpai = dojo.producers.getEntry('senpai')!.producer;
const rows: ProducerRowData<Rung>[] = [
  row(
    'student',
    'Students',
    dojo.students,
    computed(() => student.count.value),
    computed(() => dojo.kiRate.value),
    computed(
      () =>
        `${fmt(student.ownedCount.value)} hired · ${fmt(dojo.trained.value)} trained · ${fmtRate(dojo.kiRate.value)} Ki/s`,
    ),
    'Recruit',
    computed(() => true),
  ),
  row(
    'senpai',
    'Senpai',
    dojo.senpai,
    computed(() => senpai.ownedCount.value),
    computed(() => Decimal.mul(senpai.computedRate.value, senpai.ownedCount.value)),
    computed(
      () =>
        `${fmtRate(Decimal.mul(senpai.computedRate.value, senpai.ownedCount.value))} students trained a second`,
    ),
    'Promote',
    computed(() => dojo.knows('lineage')),
  ),
  row(
    'temper',
    'Temper',
    dojo.temper,
    computed(() => dojo.temper.count.value),
    computed(() => dojo.strikeValue.value),
    computed(
      () => `fist ${dojo.fist.value} · a training strike banks ${fmt(dojo.strikeValue.value)} Ki`,
    ),
    'Temper',
    computed(() => dojo.knows('iron-body')),
  ),
];
const perSecond = computed(() =>
  Decimal.add(dojo.kiRate.value, Decimal.div(dojo.strikeValue.value, kata.beatSeconds.value)),
);
</script>

<template>
  <section class="if-panel dojo" aria-label="The dojo">
    <h2 class="if-title">The dojo</h2>
    <div class="ki">
      <span class="label">Ki</span>
      <span class="amount num">{{ fmt(dojo.ki.value) }}</span>
      <span class="rate num">about {{ fmtRate(perSecond) }}/s while the student trains</span>
    </div>
    <ProducerList :rows="rows" cost-label="Ki" bulk-mode-source="none">
      <template #header
        ><span class="hand-note"
          >The scroll buys these on the student’s beats; the buttons are your own hand.</span
        ></template
      >
      <template #row="{ row, purchase }">
        <div class="rung if-reveal" :class="{ can: row.canPurchase(1) }">
          <div class="who">
            <span class="name">{{ row.displayName }}</span>
            <span class="note num">{{ row.extra!.note.value }}</span>
          </div>
          <span class="count num">{{ fmt(row.count.value) }}</span>
          <Button
            class="buy"
            :disabled="!row.canPurchase(1)"
            :data-testid="`hand-${row.id}`"
            @click="purchase"
          >
            <span>{{ row.extra!.verb }}</span>
            <span class="num">{{ fmt(row.cost(1)) }}</span>
          </Button>
        </div>
      </template>
    </ProducerList>
  </section>
</template>

<style scoped>
.ki {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 10px;
}
.ki .label {
  letter-spacing: 0.2em;
  color: var(--if-tatami);
  font-size: 12px;
}
.ki .amount {
  font-size: 30px;
  color: var(--if-lamplight);
  justify-self: end;
}
.ki .rate {
  grid-column: 1 / -1;
  justify-self: end;
  font-size: 12px;
  color: var(--if-tatami);
}
.hand-note {
  font-size: 12px;
  color: var(--if-tatami);
}
.dojo :deep(.producer-list__rows) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rung {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  border-left: 3px solid var(--if-indigo-deep);
  padding: 6px 0 6px 10px;
}
.name {
  font-size: 15px;
}
.note {
  display: block;
  font-size: 11px;
  color: var(--if-tatami);
}
.count {
  font-size: 18px;
}
.buy {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 74px;
  font: 11px var(--if-face);
  letter-spacing: 0.1em;
  color: var(--if-tatami-dim);
  background: transparent;
  border: 1px solid var(--if-lacquer-edge);
  padding: 3px 8px;
  cursor: pointer;
}
.buy .num {
  font-size: 13px;
  letter-spacing: 0;
}
.rung.can .buy {
  color: var(--if-lamplight);
  border-color: var(--if-lamplight);
}
.rung.can .buy:hover {
  background: var(--if-lamplight-soft);
}
</style>

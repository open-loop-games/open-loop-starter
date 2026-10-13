<!--
  BoardPanel — Phase II: notes come in by telephone and canvasser, and are
  cross-referenced into leads by hand or by the clerks, reassigned.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import { ANCHORS, SECOND_SHIFT_COST } from '../../data';
import { getBox, getBoard } from '../../modules';
import { cardOnce, cardRow, type CardExtra } from '../cards';
import { rate, whole } from '../format';
import IndexCard from '../components/IndexCard.vue';
import Ledger from '../components/Ledger.vue';

const box = getBox();
const board = getBoard();
const canvass = board.canvasser.repeatable!;

const ledger = computed(() => [
  { label: 'notes', value: whole(box.notes.value) },
  { label: 'leads', value: whole(board.leads.value) },
  { label: 'calls in', value: `${rate(board.noteSupply.value)}/s` },
  {
    label: 'clerks can cross-ref',
    value: `${rate(board.clerkXrefCapacity.value)}/s`,
    automated: true,
  },
]);

const rows = [
  cardRow('canvasser', canvass, {
    title: 'Send out a canvasser',
    description: 'Knocks on doors in Harrow Mill. Two notes a second.',
    unit: 'leads',
    owned: () => `${whole(canvass.count.value)} out`,
  }),
];

// The second shift shows once the lifetime lead record is halfway to its price.
const shift = cardOnce('second-shift', board.secondShift, {
  title: 'Second shift',
  description: 'The clerks stay past midnight. Doubles what they cross-reference.',
  unit: 'leads',
});
const cards = computed(() =>
  !board.secondShift.active.value &&
  new Decimal(board.leads.cumulative!.value).gte(SECOND_SHIFT_COST / 2)
    ? [shift]
    : [],
);
</script>

<template>
  <section class="nc-phase">
    <Ledger :entries="ledger" />
    <Button
      class="nc-verb"
      aria-label="Cross-reference"
      :disabled="!board.xref.canConvert.value"
      @click="board.xref.convert()"
    >
      Cross-reference <span class="nc-num">({{ ANCHORS.notesPerLead }} notes &rarr; 1 lead)</span>
    </Button>
    <ProducerList :rows="rows" cost-label="" bulk-mode-source="none">
      <template #row="{ row, purchase }">
        <IndexCard :card="row.extra as CardExtra" :can="row.canPurchase(1)" @buy="purchase()" />
      </template>
    </ProducerList>
    <UpgradeGrid v-if="cards.length" :cards="cards" :columns="1" reveal="inline">
      <template #card="{ card }">
        <IndexCard
          :card="card.extra as CardExtra"
          :can="card.canPurchase.value"
          @buy="card.purchase()"
        />
      </template>
    </UpgradeGrid>
  </section>
</template>

<!--
  BoxPanel — Phase I: the box, the reading verb and the clerks who read for
  you.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import { formatGrouped } from '@/composables/useFormatting';
import { getBox, getCase } from '../../modules';
import { cardRow } from '../cards';
import { rate } from '../format';
import IndexCard from '../components/IndexCard.vue';
import Ledger from '../components/Ledger.vue';

const box = getBox();
const read = getCase().life.isLive('read');

const empty = computed(() => new Decimal(box.pages.value).lte(0));
const ledger = computed(() => [
  { label: 'pages left', value: formatGrouped(box.pages.value) },
  { label: 'notes', value: formatGrouped(box.notes.value) },
  ...(box.clerks.value.gt(0)
    ? [{ label: 'clerks reading', value: `${rate(box.clerkReadRate.value)}/s`, automated: true }]
    : []),
]);

// The clerk card shows once the first notes are in hand.
const hire = cardRow('clerk', box.clerk, {
  title: 'Hire a clerk',
  description: 'Reads a page a second. Stays on through whatever comes next.',
  unit: 'notes',
  owned: () => (box.clerks.value.gt(0) ? `${formatGrouped(box.clerks.value)} on staff` : undefined),
});
const rows = computed(() =>
  new Decimal(box.notes.value).gte(5) || box.clerks.value.gt(0) ? [hire] : [],
);
</script>

<template>
  <section class="nc-phase">
    <Ledger :entries="ledger" />
    <Button
      repeat
      class="nc-verb"
      aria-label="Read a page"
      :disabled="!read || empty"
      @click="box.read()"
    >
      {{ empty ? 'The box is empty' : 'Read a page' }}
    </Button>
    <ProducerList :rows="rows" bulk-mode-source="none">
      <template #row="{ row, purchase }">
        <IndexCard :card="row.extra!" :can="row.canPurchase(1)" @buy="purchase()" />
      </template>
    </ProducerList>
  </section>
</template>

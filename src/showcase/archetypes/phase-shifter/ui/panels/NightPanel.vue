<!--
  NightPanel — Phase III: the night replayed as a model, 18:00 to 06:00, what
  each replay turns up, and the suspects its contradictions clear.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import { SUSPECTS } from '../../data';
import { getAutomation, getNight } from '../../modules';
import { cardOnce, cardRow, type CardExtra } from '../cards';
import { nightClock, rate, whole } from '../format';
import IndexCard from '../components/IndexCard.vue';
import Ledger from '../components/Ledger.vue';

const night = getNight();
const { tiers } = getAutomation();
const witness = night.witness.repeatable!;
const cleared = computed(() => new Decimal(night.eliminate.count.value).toNumber());

const ledger = computed(() => [
  { label: 'contradictions', value: whole(night.contradictions.value) },
  { label: 'unfiled tonight', value: whole(night.unfiled.value) },
  { label: 'turning up', value: `${rate(night.rate.value)}/s` },
  { label: 'model fidelity', value: `×${night.fidelity.value.toFixed(2)}` },
]);

const filing = computed(() => tiers.hasReached('filing'));
const rows = [
  cardRow('witness', witness, {
    title: 'File a witness account',
    description: () =>
      filing.value
        ? 'Your clerks file these at dawn now.'
        : 'One more voice in the model of that night.',
    unit: 'contradictions',
    owned: () => `${whole(witness.count.value)} filed`,
    automated: () => filing.value,
  }),
  cardRow('eliminate', night.eliminate, {
    title: () => `Clear ${night.standing.value[0]?.name ?? ''}`,
    description: () =>
      `${night.standing.value[0]?.role ?? ''}. Spend contradictions until an alibi holds.`,
    unit: 'contradictions',
  }),
];

// Insomnia shows once the first suspect has fallen.
const insomnia = cardOnce('insomnia', night.insomnia, {
  title: 'Stop sleeping',
  description: 'Coffee, cold water, the radiator off. Everything runs twice as fast.',
  unit: 'contradictions',
});
const cards = computed(() => (!night.insomnia.active.value && cleared.value > 0 ? [insomnia] : []));
</script>

<template>
  <section class="nc-phase">
    <div class="nc-nightclock" aria-label="Night clock">
      <span class="time nc-num">{{ nightClock(night.progress.value) }}</span>
      <ProgressBar :value="night.progress.value" />
      <span class="nc-label"
        >18:00 &mdash; 06:00 &middot; night {{ night.cycle.count.value + 1 }}</span
      >
    </div>
    <Ledger :entries="ledger" />
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
    <ul class="nc-suspects" aria-label="Suspects">
      <li
        v-for="(s, i) in SUSPECTS"
        :key="s.name"
        :class="{ cleared: i < cleared, unknown: i === SUSPECTS.length - 1 }"
      >
        <span class="name">{{
          i === SUSPECTS.length - 1 ? 'An account not yet filed' : s.name
        }}</span>
        <span class="role">{{ i === SUSPECTS.length - 1 ? '' : s.role }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.nc-nightclock {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 2px 16px;
}
.nc-nightclock :deep(.olui-progress-bar) {
  --progress-bar-fill: var(--nc-sodium);
  --progress-bar-track: var(--nc-soot-edge);
}
.nc-nightclock .time {
  grid-row: span 2;
  font-size: 34px;
  color: var(--nc-sodium);
}
.nc-suspects {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: grid;
  gap: 3px;
}
.nc-suspects li {
  display: flex;
  justify-content: space-between;
  padding: 4px 2px;
  border-bottom: 1px dashed var(--nc-soot-edge);
}
.nc-suspects .role {
  color: var(--nc-carbon);
  font-size: 15px;
}
.nc-suspects .cleared .name {
  text-decoration: line-through;
  text-decoration-color: var(--nc-string);
  color: var(--nc-carbon-faint);
}
.nc-suspects .unknown .name {
  color: var(--nc-carbon-faint);
  letter-spacing: 0.05em;
}
</style>

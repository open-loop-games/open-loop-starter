<!--
  InterlockerGameView — the in-game subtree, mounted under the root's post-start frame.
  The almanac and the stock ledger on the left, the drawing board in the centre (the
  Works schematic, the Estate, the Académie and the Exposition, as sheet tabs), the
  Ministry's orders and the telegraph on the right. A tab with something newly affordable
  carries a brass dot until it is visited; the Exposition sheet is not drawn until the
  riggers are patented or an Exposition is remembered. The Grand Prix's note is pushed on
  the modal stack once, at the staging that wins it.
-->
<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { ColumnShell, modalStackKey } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import {
  getAutomation,
  getCalendar,
  getEmpire,
  getExposition,
  getMinistry,
  getTelegraph,
  getWorks,
} from '../modules';
import Almanac from './components/Almanac.vue';
import GrandPrixNote from './components/GrandPrixNote.vue';
import MinistryBoard from './components/MinistryBoard.vue';
import StockLedger from './components/StockLedger.vue';
import WorksSchematic from './components/WorksSchematic.vue';
import EstatePanel from './components/EstatePanel.vue';
import AcademiePanel from './components/AcademiePanel.vue';
import ExpositionPanel from './components/ExpositionPanel.vue';
import TelegraphLine from './components/TelegraphLine.vue';

type Sheet = 'works' | 'estate' | 'academie' | 'exposition';

const works = getWorks();
const empire = getEmpire();
const expo = getExposition();

const expoRevealed = computed(
  () => works.researched('monoplane').value || expo.cycle.count.value > 0,
);
// A sheet is marked unread when it is revealed, and each time something on it becomes
// affordable while another sheet is up.
const items = computed<TabItem[]>(() => [
  { value: 'works', label: 'The Works' },
  {
    value: 'estate',
    label: 'Estate',
    notify: works.buildings.getAll().some((e) => e.purchasable.canPurchase.value),
  },
  {
    value: 'academie',
    label: 'Académie',
    notify: works.research.getAll().some((e) => e.purchasable.canPurchase.value),
  },
  {
    value: 'exposition',
    label: 'Exposition',
    visible: expoRevealed.value,
    notify:
      expo.canStage.value ||
      empire.charters.getAll().some((e) => e.purchasable.canPurchase.value) ||
      empire.bureaux.getAll().some((e) => e.purchasable.canPurchase.value),
  },
]);
const sheet = ref<Sheet>('works');

// The Grand Prix, once, at the staging that wins it. A save that already holds it loads
// before this view mounts, so the note is not shown again.
const stack = inject(modalStackKey)!;
let lastMedal = 0;
watch(empire.lifetimeRenown, (now, before) => (lastMedal = now - before), { flush: 'sync' });
watch(empire.grandPrix, (won) => {
  if (!won) return;
  stack.push(
    GrandPrixNote,
    { year: getCalendar().year.value, renown: lastMedal, expositions: expo.cycle.count.value },
    'sm',
  );
});

// Dev-only state hook for browser probes, on window.__game.
if (import.meta.env.DEV) {
  useDevHandle({
    works,
    empire,
    expo,
    telegraph: getTelegraph(),
    calendar: getCalendar(),
    ministry: getMinistry(),
    automation: getAutomation(),
  });
}
</script>

<template>
  <ColumnShell
    side-bar-left-width="minmax(250px, 280px)"
    side-bar-right-width="minmax(240px, 270px)"
  >
    <template #sideBarLeft>
      <Almanac />
      <StockLedger />
    </template>
    <Tabs v-model="sheet" :items="items" class="ae-board">
      <template #panel-works><WorksSchematic /></template>
      <template #panel-estate><EstatePanel /></template>
      <template #panel-academie><AcademiePanel /></template>
      <template #panel-exposition><ExpositionPanel /></template>
    </Tabs>
    <template #sideBarRight>
      <MinistryBoard />
      <TelegraphLine />
    </template>
  </ColumnShell>
</template>

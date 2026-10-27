<!--
  ScalerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell with a top bar and a left rail, the prestige-idle majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the
  masthead in the top bar, the prestige cards and the scanner in the rail, the
  tabs over main.
  A tab appears as its layer opens and carries a dot until it is read; each
  layer's tab holds its shop over its chain.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import { ColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import {
  createReferencePlayer,
  getAutomation,
  getCanon,
  getContinuity,
  getCore,
  getLegacy,
  getPrestige,
  getRun,
} from '../modules';
import Masthead from './components/Masthead.vue';
import CorpsPanel from './components/CorpsPanel.vue';
import ShopPanel from './components/ShopPanel.vue';
import ChainPanel from './components/ChainPanel.vue';
import ElseworldsPanel from './components/ElseworldsPanel.vue';
import PrestigeCards from './components/PrestigeCards.vue';
import ScannerPanel from './components/ScannerPanel.vue';

const core = getCore();
const prestige = getPrestige();

// The dev handle's skip plays the reference player's turn after each half-second
// chunk, the same turn the balance probes play.
if (import.meta.env.DEV) {
  const apis = {
    core,
    run: getRun(),
    legacy: getLegacy(),
    continuity: getContinuity(),
    prestige,
    automation: getAutomation(),
  };
  useDevHandle(
    { ...apis, canon: getCanon() },
    { chunk: 0.5, step: createReferencePlayer(apis).turn },
  );
}

const tabs = computed<TabItem[]>(() => [
  { value: 'corps', label: 'The Corps' },
  {
    value: 'legacy',
    label: 'Legacy',
    visible: core.reboots.value > 0 || core.rewrites.value > 0,
  },
  {
    value: 'elseworlds',
    label: 'Elseworlds',
    visible: prestige.elseworlds
      .getAll()
      .some((e) => e.challenge.visible.value || e.challenge.completed.value),
  },
  {
    value: 'continuity',
    label: 'Continuity',
    visible:
      core.rewrites.value > 0 ||
      core.ages.value > 0 ||
      Decimal.gte(prestige.pendingContinuity.value, 1),
  },
  {
    value: 'canon',
    label: 'Canon',
    visible: core.ages.value > 0 || Decimal.gte(prestige.pendingCanon.value, 1),
  },
]);
const active = ref('corps');
</script>

<template>
  <ColumnShell class="paragon-shell" side-bar-left-width="300px" max-width="1204px">
    <template #topBar><Masthead /></template>
    <template #sideBarLeft>
      <PrestigeCards />
      <ScannerPanel />
    </template>
    <Tabs v-model="active" :items="tabs">
      <template #panel-corps><CorpsPanel /></template>
      <template #panel-legacy>
        <div class="layer"><ShopPanel kind="legacy" /><ChainPanel kind="network" /></div>
      </template>
      <template #panel-elseworlds><ElseworldsPanel /></template>
      <template #panel-continuity>
        <div class="layer"><ShopPanel kind="continuity" /><ChainPanel kind="earths" /></div>
      </template>
      <template #panel-canon>
        <div class="layer"><ShopPanel kind="canon" /><ChainPanel kind="imprints" /></div>
      </template>
    </Tabs>
  </ColumnShell>
</template>

<style scoped>
.paragon-shell {
  --shell-gap: 18px;
}
.layer {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>

<!--
  ScalerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: SidebarMainShell, the prestige-idle majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the
  prestige cards and the scanner in the sidebar, the tabs over the main panel.
  A tab appears as its layer opens and carries a dot until it is read; each
  layer's tab holds its shop over its chain.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import { SidebarMainShell } from '@/lib';
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

const tabs = computed<(TabItem & { open: boolean })[]>(() => [
  { value: 'corps', label: 'The Corps', open: true },
  {
    value: 'legacy',
    label: 'Legacy',
    open: core.reboots.value > 0 || core.rewrites.value > 0,
  },
  {
    value: 'elseworlds',
    label: 'Elseworlds',
    open: prestige.elseworlds
      .getAll()
      .some((e) => e.challenge.visible.value || e.challenge.completed.value),
  },
  {
    value: 'continuity',
    label: 'Continuity',
    open:
      core.rewrites.value > 0 ||
      core.ages.value > 0 ||
      Decimal.gte(prestige.pendingContinuity.value, 1),
  },
  {
    value: 'canon',
    label: 'Canon',
    open: core.ages.value > 0 || Decimal.gte(prestige.pendingCanon.value, 1),
  },
]);
const openTabs = computed(() => tabs.value.filter((t) => t.open));
const active = ref('corps');
const seen = ref(new Set<string>(['corps']));
function select(value: string) {
  active.value = value;
  seen.value = new Set([...seen.value, value]);
}
</script>

<template>
  <div class="paragon-page">
    <Masthead />
    <SidebarMainShell class="paragon-shell" sidebar-width="300px">
      <template #sidebar>
        <PrestigeCards />
        <ScannerPanel />
      </template>
      <Tabs :model-value="active" :items="openTabs" @update:model-value="select">
        <template v-for="tab in openTabs" :key="tab.value" #[`tab-${tab.value}`]>
          {{ tab.label }}<span v-if="!seen.has(tab.value)" class="new-dot" aria-label="new" />
        </template>
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
    </SidebarMainShell>
  </div>
</template>

<style scoped>
.paragon-page {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.paragon-shell {
  padding: 0;
  gap: 18px;
}
.layer {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>

<!--
  ScalerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: SidebarMainShell, the prestige-idle majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the
  prestige cards and the scanner in the sidebar, the tabs over the main panel.
  A tab appears as its layer opens and carries a dot until it is read.
-->
<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { Decimal, type Engine } from '@open-loop/engine';
import { SidebarMainShell } from '@/lib';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import { getAutomation, getContinuity, getCore, getLegacy, getPrestige, getRun } from '../modules';
import Masthead from './components/Masthead.vue';
import CorpsPanel from './components/CorpsPanel.vue';
import ShopPanel from './components/ShopPanel.vue';
import ElseworldsPanel from './components/ElseworldsPanel.vue';
import PrestigeCards from './components/PrestigeCards.vue';
import ScannerPanel from './components/ScannerPanel.vue';

const core = getCore();
const prestige = getPrestige();

// Dev-only hook for the screenshot loop: a stable handle on the modules, and a
// skip that plays forward in half-second steps, buying both shops in price
// order and taking a pending Rewrite. Read through the hook, not a live
// `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  const legacy = getLegacy();
  const continuity = getContinuity();
  const buyAll = (shop: {
    getAll(): { purchasable: { canPurchase: { value: boolean }; purchase(n: number): unknown } }[];
  }) => shop.getAll().forEach((e) => e.purchasable.canPurchase.value && e.purchasable.purchase(1));
  (window as unknown as Record<string, unknown>).__paragon = {
    engine,
    core,
    run: getRun(),
    legacy,
    continuity,
    prestige,
    automation: getAutomation(),
    skip: (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        engine.tickDriver.advanceTime(0.5);
        if (!getAutomation().ladder.isUnlocked('dispatch')) getAutomation().recruitBest();
        buyAll(legacy.shop);
        buyAll(continuity.shop);
        if (Decimal.gte(prestige.pendingContinuity.value, 1)) prestige.rewrite();
        else if (
          Decimal.gte(
            prestige.pendingLegacy.value,
            Math.max(1, 0.5 * legacy.legacyEarned.value.toNumber()),
          )
        ) {
          prestige.reboot();
        }
      }
    },
  };
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
    open: core.rewrites.value > 0 || Decimal.gte(prestige.pendingContinuity.value, 1),
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
        <template #panel-legacy><ShopPanel kind="legacy" /></template>
        <template #panel-elseworlds><ElseworldsPanel /></template>
        <template #panel-continuity><ShopPanel kind="continuity" /></template>
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
</style>

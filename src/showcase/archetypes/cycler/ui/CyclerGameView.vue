<!--
  CyclerGameView — the in-game subtree. Mounts under the root's post-start `v-else` frame,
  so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: SidebarMainShell, the incremental majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the ledger and the
  day's work in the sidebar, the hour band over the rock in the main column. The rock is the
  biggest thing on the page, because arranging it is the game. Between watches the shell
  gives way to the logbook's page.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { SidebarMainShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { EventLog } from '@/ui/compositions';
import { getLogbook, getWatch } from '../modules';
import type { Tool } from './format';
import HourBand from './components/HourBand.vue';
import RockBoard from './components/RockBoard.vue';
import Stocks from './components/Stocks.vue';
import Reckoning from './components/Reckoning.vue';
import WorkRail from './components/WorkRail.vue';
import WatchEnd from './components/WatchEnd.vue';

const watch = getWatch();
const tool = ref<Tool>('haul');
const between = computed(() => watch.phase.value === 'setup');
const night = computed(() => watch.phase.value === 'night');

if (import.meta.env.DEV) useDevHandle({ watch, logbook: getLogbook() });
</script>

<template>
  <div class="skerry-page" :class="{ 'sk-night': night }">
    <WatchEnd v-if="between" />
    <SidebarMainShell v-else class="skerry-shell" sidebar-width="400px">
      <template #sidebar>
        <Stocks />
        <Reckoning />
        <WorkRail v-model:tool="tool" />
        <section class="log" aria-label="Keeper's log">
          <EventLog :lines="watch.log.lines.value" />
        </section>
      </template>
      <div class="main">
        <HourBand />
        <RockBoard :tool="tool" />
      </div>
    </SidebarMainShell>
  </div>
</template>

<style scoped>
.skerry-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 18px 28px;
}
.skerry-shell :deep(.olui-sidebar-main__sidebar) {
  gap: 16px;
}
.main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.log {
  border-top: 1px solid var(--sk-rule);
  padding-top: 8px;
  min-height: 120px;
}
.log :deep(.event-log) {
  gap: 0;
}
.log :deep(.event-log__row) {
  display: block;
  margin: 0 0 3px;
  color: inherit;
  font-size: 14px;
  font-style: italic;
  opacity: 0.55;
}
.log :deep(.event-log__row--fresh) {
  opacity: 0.95;
}
.log :deep(.event-log__empty) {
  display: none;
}
</style>

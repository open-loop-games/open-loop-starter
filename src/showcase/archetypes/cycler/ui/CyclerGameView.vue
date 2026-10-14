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
import { computed, inject, ref } from 'vue';
import { type Engine } from '@open-loop/engine';
import { SidebarMainShell } from '@/lib';
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

// Dev-only hook for the screenshot loop: a stable handle on the modules, and a skip that
// plays forward in one-second steps. Read through the hook, not a live `import()` that
// Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__skerry = {
    engine,
    watch,
    logbook: getLogbook(),
    skip: (seconds: number) => {
      for (let t = 0; t < seconds; t++) engine.tickDriver.advanceTime(1);
    },
  };
}
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
          <p v-for="(line, i) in watch.log.value" :key="line + i" :class="{ fresh: i === 0 }">
            {{ line }}
          </p>
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
.log p {
  margin: 0 0 3px;
  font-size: 14px;
  font-style: italic;
  opacity: 0.55;
}
.log p.fresh {
  opacity: 0.95;
}
</style>

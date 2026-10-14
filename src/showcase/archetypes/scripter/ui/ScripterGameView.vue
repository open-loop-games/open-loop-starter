<!--
  ScripterGameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: SidebarMainShell, the incremental majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the dojo and the
  shelf in the sidebar, the gate over the scroll in the main column, with the rack, the
  student's hand and the journal beside the scroll. The scroll is the widest thing on the
  page, because writing it is the game.
-->
<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { type Engine } from '@open-loop/engine';
import { SidebarMainShell } from '@/lib';
import { TECHNIQUES, type TechniqueId } from '../data';
import { getDojo, getGate, getGraduation, getKata, getLineage } from '../modules';
import DojoPanel from './components/DojoPanel.vue';
import ShelfPanel from './components/ShelfPanel.vue';
import GatePanel from './components/GatePanel.vue';
import ScrollEditor from './components/ScrollEditor.vue';
import RackPanel from './components/RackPanel.vue';
import LineagePanel from './components/LineagePanel.vue';
import JournalPanel from './components/JournalPanel.vue';

const lineage = getLineage();
const focus = ref<TechniqueId | null>(null);
const rackShown = computed(() => lineage.arrived.value.length >= 2);

// Dev-only hook for the screenshot loop: a stable handle on the modules, and a skip that
// plays forward in half-second steps, learning whatever the purse allows, as a sensei
// who reads the shelf would. Read through the hook, not a live `import()` that Vite's
// module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  const dojo = getDojo();
  (window as unknown as Record<string, unknown>).__inkfist = {
    engine,
    lineage,
    dojo,
    gate: getGate(),
    kata: getKata(),
    graduation: getGraduation(),
    skip: (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        engine.tickDriver.advanceTime(0.5);
        for (const tech of TECHNIQUES) if (!dojo.knows(tech.id)) dojo.learn(tech.id);
      }
    },
  };
}
</script>

<template>
  <div class="inkfist-page">
    <SidebarMainShell class="inkfist-shell" sidebar-width="320px">
      <template #sidebar>
        <DojoPanel />
        <ShelfPanel :focus="focus" />
      </template>
      <div class="main">
        <GatePanel />
        <div class="desk-grid">
          <ScrollEditor @technique="focus = $event" />
          <div class="side">
            <RackPanel v-if="rackShown" class="if-reveal" />
            <LineagePanel />
            <JournalPanel />
          </div>
        </div>
      </div>
    </SidebarMainShell>
  </div>
</template>

<style scoped>
.inkfist-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px;
}
.inkfist-shell {
  padding: 0;
  gap: 18px;
}
.main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.desk-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}
.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (max-width: 1100px) {
  .desk-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!--
  ScripterGameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell with a left rail, the incremental majority
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`): the dojo and the
  shelf in the rail, the gate over the scroll in main, with the rack, the student's hand
  and the journal beside the scroll. The scroll is the widest thing on the page, because
  writing it is the game. The column beside the scroll is main's own, not a right rail: the
  gate spans it, and it drops under the scroll on a narrow screen.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { ColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
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

// The dev handle's skip plays forward in half-second steps, learning whatever the purse
// allows, as a sensei who reads the shelf would.
if (import.meta.env.DEV) {
  const dojo = getDojo();
  useDevHandle(
    { lineage, dojo, gate: getGate(), kata: getKata(), graduation: getGraduation() },
    {
      chunk: 0.5,
      step: () => {
        for (const tech of TECHNIQUES) if (!dojo.knows(tech.id)) dojo.learn(tech.id);
      },
    },
  );
}
</script>

<template>
  <ColumnShell class="inkfist-shell" side-bar-left-width="320px" max-width="1364px">
    <template #sideBarLeft>
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
  </ColumnShell>
</template>

<style scoped>
.inkfist-shell {
  --shell-gap: 18px;
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

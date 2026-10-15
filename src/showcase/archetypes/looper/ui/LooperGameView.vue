<!--
  LooperGameView — the in-game subtree, mounted under the root's post-start
  frame. The idle-loops three-panel shape: the ground on the left, tonight's plan
  in the center, the case file on the right (skills, the count, the notes, the log).
-->
<script setup lang="ts">
import { ThreePanelShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { getAutomation, getMeta, getNight } from '../modules';
import GroundPanel from './panels/GroundPanel.vue';
import NightPanel from './panels/NightPanel.vue';
import SkillsPanel from './panels/SkillsPanel.vue';
import SplitsPanel from './panels/SplitsPanel.vue';
import NotesPanel from './panels/NotesPanel.vue';
import LogPanel from './panels/LogPanel.vue';

// Dev-only handle for browser probes: window.__game.skip(seconds), and the
// module APIs a probe reads. A skip steps at the arc probe's 0.1 s tick, which
// is fine enough for 4 s reps.
if (import.meta.env.DEV) {
  useDevHandle({ meta: getMeta(), night: getNight(), automation: getAutomation() }, { chunk: 0.1 });
}
</script>

<template>
  <!-- Column ratio 1 : 1.45 : 1.1 against the 1fr center, with readable floors. -->
  <ThreePanelShell
    chromeless
    left-width="minmax(250px, 0.69fr)"
    right-width="minmax(300px, 0.76fr)"
  >
    <template #left>
      <GroundPanel />
    </template>
    <NightPanel />
    <template #right>
      <SkillsPanel />
      <SplitsPanel />
      <NotesPanel />
      <LogPanel />
    </template>
  </ThreePanelShell>
</template>

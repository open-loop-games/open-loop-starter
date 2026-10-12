<!--
  LooperGameView — the in-game subtree, mounted under the root's post-start
  frame. The idle-loops three-panel shape: the ground on the left, tonight's plan
  in the center, the case file on the right (skills, the count, the notes, the log).
-->
<script setup lang="ts">
import { inject } from 'vue';
import type { Engine } from '@open-loop/engine';
import { ThreePanelShell } from '@/lib';
import { getAutomation, getMeta, getNight } from '../modules';
import GroundPanel from './panels/GroundPanel.vue';
import NightPanel from './panels/NightPanel.vue';
import SkillsPanel from './panels/SkillsPanel.vue';
import SplitsPanel from './panels/SplitsPanel.vue';
import NotesPanel from './panels/NotesPanel.vue';
import LogPanel from './panels/LogPanel.vue';

// Dev-only state hook for browser probes: reads live module state without an
// `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__looper = {
    meta: getMeta(),
    night: getNight(),
    automation: getAutomation(),
    engine: inject<Engine>('engine'),
  };
}
</script>

<template>
  <!-- Column ratio 1 : 1.45 : 1.1 against the 1fr center, with readable floors. -->
  <ThreePanelShell left-width="minmax(250px, 0.69fr)" right-width="minmax(300px, 0.76fr)">
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

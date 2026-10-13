<!--
  ProducerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: ThreePanelShell, the clicker majority's secondary shell (Cookie Clicker,
  Universal Paperclips; `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`):
  the desk you work at, the holdings you own, the office that runs them.
-->
<script setup lang="ts">
import { ThreePanelShell } from '@/lib';
import DeskPanel from './components/DeskPanel.vue';
import HoldingsPanel from './components/HoldingsPanel.vue';
import OfficePanel from './components/OfficePanel.vue';
</script>

<template>
  <ThreePanelShell class="firm" left-width="340px" right-width="360px">
    <template #left>
      <DeskPanel />
    </template>
    <HoldingsPanel />
    <template #right>
      <OfficePanel />
    </template>
  </ThreePanelShell>
</template>

<style scoped>
.firm {
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}
/* The desk is the surface: the shell's columns draw no box of their own. */
.firm {
  gap: 18px;
  padding: 18px;
}
.firm :deep(.olui-three-panel__left),
.firm :deep(.olui-three-panel__main),
.firm :deep(.olui-three-panel__right) {
  background: transparent;
  border: none;
  padding: 0;
}
</style>

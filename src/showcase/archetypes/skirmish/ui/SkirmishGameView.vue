<!--
  SkirmishGameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: ThreePanelShell under a HUD. The shell research has no RTS row; this is the combat
  genres' deck: a central play surface (the safehouses and the districts) with the economy
  and the training floors on the left, research and the crew on the right, and the purse
  over all three. The contract sheet lies over the deck while the match is not live.
-->
<script setup lang="ts">
import { ThreePanelShell } from '@/lib';
import ContractSheet from './components/ContractSheet.vue';
import CrewHud from './components/CrewHud.vue';
import CrewPanel from './components/CrewPanel.vue';
import HustlePanel from './components/HustlePanel.vue';
import MapBoard from './components/MapBoard.vue';
import ResearchPanel from './components/ResearchPanel.vue';
</script>

<template>
  <div class="deck">
    <CrewHud />
    <ThreePanelShell class="deck__shell" chromeless left-width="290px" right-width="300px">
      <template #left>
        <HustlePanel />
      </template>
      <MapBoard />
      <template #right>
        <aside class="cc-panel" aria-label="Research and crew">
          <ResearchPanel />
          <CrewPanel />
        </aside>
      </template>
    </ThreePanelShell>
    <ContractSheet />
  </div>
</template>

<style scoped>
.deck {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  min-width: 0;
  padding: var(--gap);
}
.deck__shell {
  padding: 0;
  grid-template-columns: var(--three-panel-left-width) minmax(560px, 1fr) var(
      --three-panel-right-width
    );
}
</style>

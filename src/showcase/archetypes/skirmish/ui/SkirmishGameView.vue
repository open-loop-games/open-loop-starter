<!--
  SkirmishGameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell with the HUD as its top bar, in a fixed viewport. The shell research has
  no RTS row; this is the combat genres' deck: a central play surface (the safehouses and the
  districts) with the economy and the training floors on the left, the crew and research on
  the right, and the purse over all three. The viewport is fixed so the purse and the board
  stay in view while each panel scrolls on its own. The contract sheet lies over the deck
  while the match is not live.
-->
<script setup lang="ts">
import { ColumnShell } from '@/lib';
import ContractSheet from './components/ContractSheet.vue';
import CrewHud from './components/CrewHud.vue';
import CrewPanel from './components/CrewPanel.vue';
import HustlePanel from './components/HustlePanel.vue';
import MapBoard from './components/MapBoard.vue';
import ResearchPanel from './components/ResearchPanel.vue';
</script>

<template>
  <div class="deck">
    <ColumnShell
      viewport="fixed"
      side-bar-left-width="290px"
      side-bar-right-width="300px"
      main-min-width="560px"
    >
      <template #topBar>
        <CrewHud />
      </template>
      <template #sideBarLeft>
        <HustlePanel />
      </template>
      <MapBoard />
      <template #sideBarRight>
        <aside class="cc-panel" aria-label="Research and crew">
          <CrewPanel />
          <ResearchPanel />
        </aside>
      </template>
    </ColumnShell>
    <ContractSheet />
  </div>
</template>

<style scoped>
/* The positioning box the contract sheet covers: the whole shell, top bar included. */
.deck {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
</style>

<!--
  SkirmishGameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell with the HUD as its top bar, in a fixed viewport. The shell research has
  no RTS row; this is the combat genres' deck: the field in the centre, with the command
  card under it and the street feed under that, the economy and the training floors on the
  left, the crew and research on the right, and the purse over all three. The viewport is
  fixed so the purse and the field stay in view while each panel scrolls on its own. The
  contract sheet lies over the deck while the match is not live.

  The selection belongs to this view: the field and the command card both edit it.
-->
<script setup lang="ts">
import { onBeforeUnmount, ref, watchEffect } from 'vue';
import { useDevHandle } from '@/composables/useDevHandle';
import { ColumnShell } from '@/lib';
import { getMatch } from '../modules';
import { clearSelection, createSelection, pruneSelection } from './command';
import CommandCard from './components/CommandCard.vue';
import ContractSheet from './components/ContractSheet.vue';
import CrewHud from './components/CrewHud.vue';
import CrewPanel from './components/CrewPanel.vue';
import FeedPanel from './components/FeedPanel.vue';
import HustlePanel from './components/HustlePanel.vue';
import ResearchPanel from './components/ResearchPanel.vue';
import SkirmishField from './components/SkirmishField.vue';

const match = getMatch();
const selection = createSelection();
watchEffect(() => pruneSelection(selection, match.p));
onBeforeUnmount(match.onReset('afterReset', () => clearSelection(selection)));
const field = ref<InstanceType<typeof SkirmishField>>();
if (import.meta.env.DEV) useDevHandle({ match, selection, field });
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
      <div class="centre">
        <SkirmishField ref="field" class="centre__field" :selection="selection" />
        <CommandCard class="centre__card" :selection="selection" />
        <FeedPanel class="centre__feed" />
      </div>
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
.centre {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px;
}
.centre__field {
  flex: 1 1 340px;
}
/* A fixed height: a selection that opens a taller card must not resize the field. */
.centre__card {
  flex: 0 0 216px;
}
.centre__feed {
  flex: 0 0 96px;
}
</style>

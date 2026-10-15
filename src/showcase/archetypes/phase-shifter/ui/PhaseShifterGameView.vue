<!--
  PhaseShifterGameView — the in-game subtree, mounted under the root's
  post-start frame. One column: the phase tabs, the current phase's desk, the
  next door, what the doors have filed away, and the carbon. Once the last
  door opens, the ending replaces all of it.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { SingleColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { bestCell, planWatches } from '../data';
import { getAutomation, getBoard, getBox, getCase, getNight } from '../modules';
import BoxPanel from './panels/BoxPanel.vue';
import BoardPanel from './panels/BoardPanel.vue';
import NightPanel from './panels/NightPanel.vue';
import LastPagePanel from './panels/LastPagePanel.vue';
import PhaseTabs from './components/PhaseTabs.vue';
import DoorEnvelope from './components/DoorEnvelope.vue';
import FiledAway from './components/FiledAway.vue';
import CaseLog from './components/CaseLog.vue';
import Ending from './components/Ending.vue';

const kase = getCase();
const phase = kase.life.doorsOpened;
// The corkboard needs the room; the other phases read best narrow.
const width = computed(() => (phase.value === 1 ? '880px' : '700px'));

// Dev-only state hook for browser probes, on window.__game.
if (import.meta.env.DEV) {
  useDevHandle({
    case: kase,
    box: getBox(),
    board: getBoard(),
    night: getNight(),
    automation: getAutomation(),
    /** Pin the inbox as the spine's reference player does. */
    arrange: () => {
      const board = getBoard();
      while (board.inbox.value.length) {
        const id = board.inbox.value[0];
        const cell = bestCell(board.pins.value, board.side.value, id);
        if (!cell || !board.pin(id, cell.x, cell.y)) break;
      }
    },
    /** Plan tonight as the spine's reference player does. */
    plan: () => getNight().setPlan(planWatches(getNight().view(true))),
  });
}
</script>

<template>
  <SingleColumnShell :max-width="width">
    <Ending v-if="kase.closed.value" />
    <template v-else>
      <PhaseTabs :phase="phase" />
      <BoxPanel v-if="phase === 0" />
      <BoardPanel v-else-if="phase === 1" />
      <NightPanel v-else-if="phase === 2" />
      <LastPagePanel v-else />
      <DoorEnvelope />
      <FiledAway />
      <CaseLog />
    </template>
  </SingleColumnShell>
</template>

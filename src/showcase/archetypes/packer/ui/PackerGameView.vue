<!--
  PackerGameView — the in-game subtree, mounted under the root's post-start frame. The
  breach line is the shell's top bar: the ship plate, the carrier and the Engage console.
  Below it the fabricator is on the left, the hull board in the centre, and on the right
  the sector's conditions, fire control, the hull's plating, refits and calibration, and
  the next ship's commission. The viewport is fixed, so each console scrolls on its own
  while the hull board stays where the hand is. The fitting state (the held module and its
  facing, the hovered cell) is provided here, so the board and both consoles read one hand.
  Escape lets go of the held module; R turns a held or hovered Fire Director.
-->
<script setup lang="ts">
import { inject, watch } from 'vue';
import { ColumnShell, modalStackKey } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { useWindowKeys } from '@/composables/useWindowKeys';
import { PIECE_BY_ID } from '../data';
import { getBoard, getFleet, getLine, getYard } from '../modules';
import { provideFitting } from './fitting';
import { useShipInService } from './ship';
import BreachLine from './components/BreachLine.vue';
import Fabricator from './components/Fabricator.vue';
import HullBoard from './components/HullBoard.vue';
import SectorPanel from './components/SectorPanel.vue';
import FireControl from './components/FireControl.vue';
import HullRefits from './components/HullRefits.vue';
import Commission from './components/Commission.vue';
import DreadnoughtNote from './components/DreadnoughtNote.vue';

const fitting = provideFitting();
const board = getBoard();
const fleet = getFleet();
const ship = useShipInService();

/** R turns the held Fire Director, or the fitted one under the pointer. */
function turn() {
  if (fitting.hand) {
    if (PIECE_BY_ID[fitting.hand].turns) fitting.facing = (fitting.facing + 1) % 4;
    return;
  }
  const h = fitting.hover;
  const o = h && board.occupantAt(h.x, h.y);
  if (o) board.turn(o.id);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') fitting.hand = null;
  else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) turn();
}
useWindowKeys(onKey);

// The story's end, once, when the Dreadnought falls. A save that already holds it loads
// before this view mounts, so the note is not shown again.
const stack = inject(modalStackKey)!;
watch(fleet.storyEnded, (ended) => {
  if (!ended) return;
  stack.push(
    DreadnoughtNote,
    { ship: ship.def.value.name, honours: fleet.honours.value, honourMult: fleet.honourMult.value },
    'sm',
  );
});

// Dev-only state hook for browser probes, on window.__game.
if (import.meta.env.DEV) {
  useDevHandle({ yard: getYard(), board, fleet, line: getLine(), fitting });
}
</script>

<template>
  <ColumnShell
    viewport="fixed"
    side-bar-left-width="minmax(290px, 330px)"
    side-bar-right-width="minmax(300px, 340px)"
  >
    <template #topBar>
      <BreachLine />
    </template>
    <template #sideBarLeft>
      <Fabricator />
    </template>
    <HullBoard />
    <template #sideBarRight>
      <SectorPanel />
      <FireControl />
      <HullRefits />
      <Commission />
    </template>
  </ColumnShell>
</template>

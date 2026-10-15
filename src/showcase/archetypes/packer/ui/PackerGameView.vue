<!--
  PackerGameView — the in-game subtree, mounted under the root's post-start frame. The
  breach line runs full width over the shell: the ship plate, the carrier and the Engage
  console. Below it the fabricator is on the left, the hull board in the centre, and on the
  right the sector's conditions, fire control, the hull's plating, refits and calibration,
  and the next ship's commission. The fitting state (the held module and its facing, the
  hovered cell) is provided here, so the board and both consoles read one hand. Escape lets
  go of the held module; R turns a held or hovered Fire Director.
-->
<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, watch } from 'vue';
import type { Engine } from '@open-loop/engine';
import { ThreePanelShell, modalStackKey } from '@/lib';
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
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

// The story's end, once, when the Dreadnought falls. A save that already holds it loads
// before this view mounts, so the note is not shown again.
const stack = inject(modalStackKey)!;
watch(fleet.storyEnded, (ended) => {
  if (!ended) return;
  const id = stack.push(
    DreadnoughtNote,
    {
      ship: ship.def.value.name,
      honours: fleet.honours.value,
      honourMult: fleet.honourMult.value,
      onClose: () => stack.remove(id),
    },
    'sm',
  );
});

// Dev-only state hook for browser probes: reads live module state without an `import()`
// that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__hardpoint = {
    engine,
    yard: getYard(),
    board,
    fleet,
    line: getLine(),
    fitting,
    skip: (seconds: number) => engine.tickDriver.advanceTime(seconds),
  };
}
</script>

<template>
  <div class="hp-deck">
    <BreachLine />
    <ThreePanelShell left-width="minmax(290px, 330px)" right-width="minmax(300px, 340px)">
      <template #left>
        <Fabricator />
      </template>
      <HullBoard />
      <template #right>
        <SectorPanel />
        <FireControl />
        <HullRefits />
        <Commission />
      </template>
    </ThreePanelShell>
  </div>
</template>

<style scoped>
.hp-deck {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

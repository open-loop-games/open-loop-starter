<!--
  PlacementBoard — the shared grid. Reactors / Relays / Lances / Bulwarks occupy the
  one board; the top `forwardRows` are the salvo-ranged line where Lances clear C.
  Adopts the multiverse-hr seating pattern: `useBoardControl` derives the cell grid +
  a `cellClasses` grammar and owns selection/hover, running the lifted adjacency
  evaluator as the hover-preview overlay. Click an empty cell to place the armed
  piece, or an occupied cell to clear it. Build locks during INBOUND (upstream tone).
-->
<script setup lang="ts">
import { getBuild } from '../../modules';
import type { PieceKind } from '../../data/pieces';
import Button from '@/ui/components/Button.vue';
import { useBoardControl } from '../../composables/useBoardControl';

const build = getBuild();
const cols = build.width;
const board = useBoardControl();

const GLYPH: Record<PieceKind, { ic: string; code: string; tone: string }> = {
  reactor: { ic: '◆', code: 'rctr', tone: 'prod' },
  lance: { ic: '▲', code: 'lnc', tone: 'tow' },
  relay: { ic: '+', code: 'rly', tone: 'boost' },
  pylon: { ic: 'Ψ', code: 'pyln', tone: 'boost' },
  bulwark: { ic: '▚', code: 'blwk', tone: 'rpr' },
};
</script>

<template>
  <div
    class="cyc-board"
    :style="{ '--cyc-cols': cols }"
  >
    <template
      v-for="row in board.rows.value"
      :key="row[0].y"
    >
      <Button
        v-for="cell in row"
        :key="cell.x + ',' + cell.y"
        as="button"
        class="cyc-cell"
        :class="board.cellClasses(cell)"
        :aria-label="`cell ${cell.x},${cell.y}${cell.kind ? ' — ' + cell.kind : ' — empty'}`"
        @click="board.onCellClick(cell)"
        @mouseenter="board.onCellHover(cell)"
        @mouseleave="board.onCellLeave()"
      >
        <span
          v-if="cell.kind"
          class="cyc-pc"
          :class="GLYPH[cell.kind].tone"
        >
          <span class="cyc-pc__ic">{{ GLYPH[cell.kind].ic }}</span>
          <span class="cyc-pc__code">{{ GLYPH[cell.kind].code }}</span>
        </span>
      </Button>
    </template>
  </div>
</template>

<style scoped>
.cyc-board {
  display: grid;
  grid-template-columns: repeat(var(--cyc-cols), minmax(0, 62px));
  gap: 5px;
  justify-content: center;
  padding: 11px;
  position: relative;
}
:global(.cyc-world[data-locked='1'] .cyc-board) {
  opacity: 0.85;
}
.cyc-cell {
  aspect-ratio: 1/1;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 16, 22, 0.5);
  border: 1px solid var(--cyc-grn2);
  position: relative;
  cursor: pointer;
  padding: 0;
  font-family: var(--cyc-mono);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}
/* The salvo-ranged forward line — the contested top rows. */
.cyc-cell.forward {
  background: linear-gradient(180deg, rgba(255, 176, 0, 0.06), rgba(7, 16, 22, 0.5) 60%);
  border-top-color: color-mix(in srgb, var(--cyc-amb) 40%, var(--cyc-grn2));
}
.cyc-cell.empty {
  border-color: var(--cyc-grndim);
}
.cyc-cell.forward.empty {
  border-top-color: color-mix(in srgb, var(--cyc-amb) 32%, var(--cyc-grndim));
}
.cyc-cell.empty::after {
  content: '·';
  color: var(--cyc-grndim);
}
.cyc-cell.drop-target:hover {
  border-color: var(--cyc-grn);
  background: rgba(56, 255, 171, 0.06);
}
/* Static adjacency aura (a boosted receiver) + the hover-preview overlay. */
.cyc-cell.aura {
  box-shadow:
    inset 0 0 0 1px var(--cyc-amb),
    0 0 8px -2px var(--cyc-amb);
}
.cyc-cell.reach-covered {
  border-color: var(--cyc-amb);
}
.cyc-cell.reach-boosted {
  box-shadow:
    inset 0 0 0 1px var(--cyc-amb),
    0 0 10px -1px var(--cyc-amb);
}
.cyc-cell.preview-target {
  border-color: var(--cyc-grn);
  border-style: dashed;
}
/* A forward Lance firing during INBOUND — the muzzle flash. */
.cyc-cell.firing {
  box-shadow:
    0 0 10px -2px var(--cyc-blu),
    inset 0 0 0 1px var(--cyc-blu);
}
.cyc-cell.firing::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 50%;
  width: 2px;
  height: 6px;
  transform: translateX(-50%);
  background: var(--cyc-blu);
  box-shadow: 0 0 6px var(--cyc-blu);
}

.cyc-pc {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.cyc-pc__ic {
  font-size: 16px;
  line-height: 1;
}
.cyc-pc__code {
  font-size: 8px;
  letter-spacing: 0.3px;
}
.cyc-pc__code::before {
  content: '[';
}
.cyc-pc__code::after {
  content: ']';
}
.cyc-pc.prod {
  color: var(--cyc-grn);
}
.cyc-pc.boost {
  color: var(--cyc-amb);
}
.cyc-pc.tow {
  color: var(--cyc-blu);
}
.cyc-pc.rpr {
  color: var(--cyc-ink);
}
</style>

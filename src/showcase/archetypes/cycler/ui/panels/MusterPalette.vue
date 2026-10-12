<!--
  MusterPalette — the build tray. The four pieces of the shared grid; selecting one
  arms it for placement on the board. Placement is FREE (no per-piece cost) — the
  economy is the shared MW pool (Lances draw to fire) and the finite board, not a
  per-piece cost, so each card shows its role + effect instead. Build locks during INBOUND
  (you live with what you placed). Selection is shared with the board via
  `useBoardControl`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { PIECES, type PieceKind } from '../../data/pieces';
import { useBoardControl } from '../../composables/useBoardControl';
import { useCommandState } from '../../composables/useCommandState';

const board = useBoardControl();
const cmd = useCommandState();

interface PaletteEntry {
  kind: PieceKind;
  ic: string;
  tone: string;
  effect: string;
}
const PALETTE: PaletteEntry[] = [
  { kind: 'reactor', ic: '◆', tone: 'prod', effect: `+${PIECES.reactor.output} MW output` },
  {
    kind: 'lance',
    ic: '▲',
    tone: 'tow',
    effect: `+${PIECES.lance.intercept} C · −${PIECES.lance.draw} MW draw`,
  },
  {
    kind: 'relay',
    ic: '+',
    tone: 'boost',
    effect: `+${Math.round((PIECES.relay.boost ?? 0) * 100)}% cross-adjacent`,
  },
  {
    kind: 'pylon',
    ic: 'Ψ',
    tone: 'boost',
    effect: `+${Math.round((PIECES.pylon.boost ?? 0) * 100)}% range-2`,
  },
  { kind: 'bulwark', ic: '▚', tone: 'rpr', effect: `+${PIECES.bulwark.throughput} line repair` },
];

const locked = computed(() => cmd.buildLocked.value);
</script>

<template>
  <div class="cyc-panel cyc-muster">
    <h3 class="cyc-slab">Muster</h3>
    <div class="cyc-palette">
      <Button
        v-for="p in PALETTE"
        :key="p.kind"
        as="button"
        class="cyc-pcard"
        :class="[p.tone, { selected: board.selectedKind.value === p.kind }]"
        :disabled="locked"
        :aria-pressed="board.selectedKind.value === p.kind"
        @click="board.select(p.kind)"
      >
        <span class="cyc-pcard__t">
          <span class="cyc-pcard__ic" :class="p.tone">{{ p.ic }}</span>
          {{ PIECES[p.kind].title }}
        </span>
        <span class="cyc-pcard__d">{{ PIECES[p.kind].description }}</span>
        <span class="cyc-pcard__eff">{{ p.effect }}</span>
      </Button>
    </div>
    <div v-if="locked" class="cyc-tray-lock">▚ build locked · engagement</div>
    <p v-else class="cyc-muster__hint">
      Forward rows range the salvos — Lances clear there. Reactors, Relays &amp; Bulwarks sit
      behind.
    </p>
  </div>
</template>

<style scoped>
.cyc-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cyc-pcard {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: rgba(7, 16, 22, 0.6);
  border: 1px solid var(--cyc-grn2);
  cursor: pointer;
  font-family: var(--cyc-mono);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.cyc-pcard:hover:not(:disabled) {
  border-color: var(--cyc-grn);
}
.cyc-pcard.selected {
  border-color: var(--cyc-grn);
  box-shadow: inset 0 0 0 1px var(--cyc-grn);
}
.cyc-pcard:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cyc-pcard__t {
  font-size: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--cyc-grn);
}
.cyc-pcard__ic.prod {
  color: var(--cyc-grn);
}
.cyc-pcard__ic.tow {
  color: var(--cyc-blu);
}
.cyc-pcard__ic.boost {
  color: var(--cyc-amb);
}
.cyc-pcard__ic.rpr {
  color: var(--cyc-ink);
}
.cyc-pcard__d {
  display: block;
  font-size: 10px;
  opacity: 0.65;
  margin: 3px 0 5px;
  line-height: 1.3;
}
.cyc-pcard__eff {
  display: block;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--cyc-grn2);
}
.cyc-pcard.tow .cyc-pcard__eff {
  color: var(--cyc-blu);
}
.cyc-pcard.boost .cyc-pcard__eff {
  color: var(--cyc-amb);
}
.cyc-tray-lock {
  margin-top: 8px;
  border: 1px dashed var(--cyc-amb);
  color: var(--cyc-amb);
  font-size: 10px;
  letter-spacing: 1px;
  text-align: center;
  padding: 6px;
  text-transform: uppercase;
}
.cyc-muster__hint {
  margin: 8px 0 0;
  font-size: 9.5px;
  line-height: 1.4;
  color: var(--cyc-grn2);
  opacity: 0.8;
}
</style>

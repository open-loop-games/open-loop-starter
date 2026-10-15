<!--
  BoardPanel — Phase II: the corkboard. Cards the clerks write up wait in the
  inbox; the player pins them, and red string runs between neighbours that
  share a person, a place or an hour. Select a card, and each open cell shows
  what pinning it there would add. The wall beyond the open square is old
  notices until it is cleared.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/ui/components/Button.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import { formatGrouped } from '@/composables/useFormatting';
import { BOARD_SIDE, CARD_BY_ID, DECK, cellAt, pinGain, stringStrength } from '../../data';
import { getBoard } from '../../modules';
import { cardRow } from '../cards';
import { rate } from '../format';
import FactCard from '../components/FactCard.vue';
import IndexCard from '../components/IndexCard.vue';
import Ledger from '../components/Ledger.vue';

const board = getBoard();

const ledger = computed(() => [
  { label: 'leads', value: formatGrouped(board.leads.value) },
  { label: 'string earns', value: `${rate(board.rate.value)}/s` },
  { label: 'cards written', value: `${board.written.value} / ${DECK.length}` },
  { label: 'in the inbox', value: String(board.inbox.value.length), automated: true },
]);

/** The card in hand: from the inbox, or lifted off a cell. */
const held = ref<{ id: string; from: number | null } | null>(null);

const cells = computed(() => {
  const side = board.side.value;
  const pins = board.pins.value;
  const lifted = held.value?.from ?? null;
  const without = lifted === null ? pins : pins.map((p, i) => (i === lifted ? null : p));
  const out = [];
  for (let y = 0; y < BOARD_SIDE; y++) {
    for (let x = 0; x < BOARD_SIDE; x++) {
      const i = cellAt(x, y);
      const open = x < side && y < side;
      const card = pins[i];
      const gain =
        held.value && open && !without[i] ? pinGain(without, side, held.value.id, x, y) : null;
      out.push({ i, x, y, open, card, gain, lifted: i === lifted });
    }
  }
  return out;
});

/** String between each pinned neighbour pair on the open board, with its strength. */
const strings = computed(() => {
  const side = board.side.value;
  const pins = board.pins.value;
  const out: { key: string; x: number; y: number; dir: 'h' | 'v'; strength: number }[] = [];
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const a = pins[cellAt(x, y)];
      if (!a) continue;
      for (const [dx, dy, dir] of [
        [1, 0, 'h'],
        [0, 1, 'v'],
      ] as const) {
        const b = x + dx < side && y + dy < side ? pins[cellAt(x + dx, y + dy)] : null;
        const s = b ? stringStrength(CARD_BY_ID[a], CARD_BY_ID[b]) : 0;
        if (s > 0) out.push({ key: `${x},${y},${dir}`, x, y, dir, strength: s });
      }
    }
  }
  return out;
});

function pickInbox(id: string): void {
  held.value = held.value?.id === id ? null : { id, from: null };
}

function clickCell(cell: (typeof cells.value)[number]): void {
  if (!cell.open) return;
  if (cell.card && !held.value) {
    held.value = { id: cell.card, from: cell.i };
    return;
  }
  if (cell.card) {
    held.value = cell.lifted ? null : { id: cell.card, from: cell.i };
    return;
  }
  if (held.value && board.pin(held.value.id, cell.x, cell.y)) held.value = null;
}

function returnToInbox(): void {
  const from = held.value?.from;
  if (from === null || from === undefined) return;
  board.unpin(from % BOARD_SIDE, Math.floor(from / BOARD_SIDE));
  held.value = null;
}

const wall = cardRow('wall', board.wall, {
  title: 'Clear more wall',
  description: 'Take down the old notices. The board grows by a row and a column.',
  unit: 'leads',
  owned: () => `${board.side.value} × ${board.side.value}`,
});
const rows = [wall];
</script>

<template>
  <section class="nc-phase">
    <Ledger :entries="ledger" />
    <div class="nc-board-desk">
      <div class="nc-cork" :style="{ '--side': BOARD_SIDE }" aria-label="Corkboard">
        <Button
          v-for="cell in cells"
          :key="cell.i"
          class="nc-cell"
          :class="{
            open: cell.open,
            pinned: !!cell.card,
            lifted: cell.lifted,
            target: cell.gain !== null,
          }"
          :style="{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }"
          :disabled="!cell.open"
          :aria-label="
            cell.card ? `Pinned card ${cell.card}` : cell.open ? 'Empty cell' : 'Old notices'
          "
          @click="clickCell(cell)"
        >
          <FactCard v-if="cell.card" :id="cell.card" />
          <span v-else-if="cell.gain !== null" class="gain nc-num">
            {{ cell.gain > 0 ? `+${cell.gain}` : '·' }}
          </span>
        </Button>
        <span
          v-for="s in strings"
          :key="s.key"
          class="nc-string"
          :class="[s.dir, `s${s.strength}`]"
          :style="{ '--x': s.x, '--y': s.y }"
          aria-hidden="true"
        />
      </div>
      <aside class="nc-inbox" aria-label="Inbox">
        <h2 class="nc-label">Inbox</h2>
        <Button
          v-if="held && held.from !== null"
          class="nc-return"
          aria-label="Take the card down"
          @click="returnToInbox()"
        >
          Take it down
        </Button>
        <Button
          v-for="id in board.inbox.value"
          :key="id"
          class="nc-inbox-card"
          :class="{ held: held?.id === id }"
          :aria-label="`Inbox card ${id}`"
          @click="pickInbox(id)"
        >
          <FactCard :id="id" />
        </Button>
        <p v-if="!board.inbox.value.length" class="empty">Nothing waiting.</p>
      </aside>
    </div>
    <ProducerList :rows="rows" bulk-mode-source="none">
      <template #row="{ row, purchase }">
        <IndexCard :card="row.extra!" :can="row.canPurchase(1)" @buy="purchase()" />
      </template>
    </ProducerList>
  </section>
</template>

<style scoped>
.nc-board-desk {
  display: grid;
  grid-template-columns: auto minmax(150px, 1fr);
  gap: 18px;
  align-items: start;
}
.nc-cork {
  --cell-w: 98px;
  --cell-h: 62px;
  --gap: 14px;
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--side), var(--cell-w));
  grid-template-rows: repeat(var(--side), var(--cell-h));
  gap: var(--gap);
  padding: 14px;
  background:
    radial-gradient(circle at 20% 30%, rgba(0, 0, 0, 0.18) 0 1px, transparent 2px) 0 0 / 9px 9px,
    radial-gradient(circle at 70% 60%, rgba(255, 230, 190, 0.06) 0 1px, transparent 2px) 0 0 / 7px
      7px,
    #5a4330;
  border: 6px solid #2a2118;
  border-radius: 2px;
}
.nc-cell {
  position: relative;
  padding: 0;
  border: 1px dashed transparent;
  border-radius: 1px;
  background: rgba(20, 18, 15, 0.55);
  color: var(--nc-carbon-faint);
  /* Old notices: shut wall stays visible, never hidden. */
  opacity: 1;
  cursor: default;
}
.nc-cell:not(.open) {
  background: repeating-linear-gradient(
    -45deg,
    rgba(230, 223, 209, 0.07) 0 6px,
    rgba(20, 18, 15, 0.5) 6px 12px
  );
}
.nc-cell.open {
  background: rgba(20, 18, 15, 0.28);
  border-color: rgba(230, 223, 209, 0.14);
  cursor: pointer;
}
.nc-cell.target {
  border-color: var(--nc-manila);
}
.nc-cell.pinned {
  border-color: transparent;
  background: transparent;
}
.nc-cell.lifted {
  outline: 2px solid var(--nc-manila);
  outline-offset: 3px;
  transform: rotate(-2deg);
}
.gain {
  font-family: var(--nc-face-typed);
  font-size: 15px;
  color: var(--nc-manila);
}
.nc-string {
  position: absolute;
  pointer-events: none;
  background: var(--nc-string);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}
.nc-string.h {
  left: calc(14px + var(--x) * (var(--cell-w) + var(--gap)) + var(--cell-w) - 6px);
  top: calc(14px + var(--y) * (var(--cell-h) + var(--gap)) + var(--cell-h) / 2);
  width: calc(var(--gap) + 12px);
  height: 2px;
}
.nc-string.v {
  left: calc(14px + var(--x) * (var(--cell-w) + var(--gap)) + var(--cell-w) / 2);
  top: calc(14px + var(--y) * (var(--cell-h) + var(--gap)) + var(--cell-h) - 6px);
  width: 2px;
  height: calc(var(--gap) + 12px);
}
.nc-string.s2.h {
  height: 4px;
  margin-top: -1px;
}
.nc-string.s2.v {
  width: 4px;
  margin-left: -1px;
}
.nc-inbox {
  display: grid;
  gap: 8px;
  align-content: start;
  max-height: 520px;
  overflow-y: auto;
}
.nc-inbox h2 {
  margin: 0;
}
.nc-inbox-card {
  height: 62px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
.nc-inbox-card {
  transition: transform 120ms ease-out;
}
.nc-inbox-card.held {
  transform: translateX(-10px);
  outline: 2px solid var(--nc-manila);
  outline-offset: 2px;
}
.nc-return {
  padding: 6px 10px;
  border: 1px solid var(--nc-manila-dim);
  border-radius: var(--nc-radius);
  background: transparent;
  color: var(--nc-manila);
  font-size: 14px;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.empty {
  margin: 0;
  font-size: 15px;
  color: var(--nc-carbon-faint);
}
</style>

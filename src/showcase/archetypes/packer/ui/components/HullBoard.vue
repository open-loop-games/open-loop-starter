<!--
  HullBoard — the hull lattice in the ship's silhouette, and the firing solution. A held
  module hovered over a socket shows every affected cell's dps delta, and the reach of
  the module under the pointer is outlined in blueprint; hovering a fitted weapon outlines
  the modules feeding it in plasma.

  Fitting grammar: click a socket to fit the held module; click a fitted module to lift it
  into the hand; click a held module over a different one to replace it, sending the old
  one to the bay; right-click stows a fitted module, or lets go of the held one.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { HULL_H, HULL_MAP, HULL_W, PIECE_BY_ID, type PieceId } from '../../data';
import { cellKey, getBoard, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt, signed } from '../format';

const board = getBoard();
const yard = getYard();
const fitting = useFitting();

// The occupancy grid is not reactive; reading `placed` subscribes each derivation to the board.
const cells = computed(() => {
  void board.placed.value;
  void board.openCells.value;
  const out = [];
  for (let y = 0; y < HULL_H; y++)
    for (let x = 0; x < HULL_W; x++) {
      const ch = HULL_MAP[y]![x]!;
      out.push({
        x,
        y,
        key: cellKey(x, y),
        void: ch === '.',
        section: ch === '.' ? -1 : Number(ch),
        open: board.isOpen(x, y),
        occupant: board.occupantAt(x, y),
      });
    }
  return out;
});

/** What the pointer is asking about: a held module at the hovered cell, or the hovered module itself. */
const focus = computed<{ type: PieceId; x: number; y: number; hypothetical: boolean } | null>(
  () => {
    void board.placed.value;
    const h = fitting.hover;
    if (!h) return null;
    if (fitting.hand) return { type: fitting.hand, x: h.x, y: h.y, hypothetical: true };
    const o = board.occupantAt(h.x, h.y);
    return o ? { type: o.type, x: o.x, y: o.y, hypothetical: false } : null;
  },
);

const reach = computed(() => {
  const f = focus.value;
  const set = new Set<string>();
  if (!f) return set;
  for (const c of board.reach(f.type, f.x, f.y))
    if (HULL_MAP[c.y]![c.x] !== '.') set.add(cellKey(c.x, c.y));
  return set;
});

/** The modules feeding the hovered weapon, outlined so the player sees what reaches it. */
const sources = computed(() => {
  const set = new Set<string>();
  const f = focus.value;
  if (!f || f.hypothetical) return set;
  const o = board.occupantAt(f.x, f.y)!;
  const layout = board.layout.value;
  for (const t of layout.pieces.get(o.id)?.terms ?? []) {
    const src = layout.pieces.get(t.fromId);
    if (src) set.add(cellKey(src.x, src.y));
  }
  return set;
});

/** A held module may land on an empty socket, or replace a different module. */
function canLand(x: number, y: number): boolean {
  if (!fitting.hand) return false;
  const o = board.occupantAt(x, y);
  if (!o) return board.canPlace(fitting.hand, x, y);
  return o.type !== fitting.hand && board.stock(fitting.hand) > 0;
}

const legalHover = computed(() => {
  void board.placed.value;
  const h = fitting.hover;
  return !!(h && canLand(h.x, h.y));
});

const preview = computed(() => {
  const h = fitting.hover;
  if (!fitting.hand || !h || !legalHover.value) return null;
  return board.preview(fitting.hand, h.x, h.y);
});

function press(x: number, y: number) {
  const o = board.occupantAt(x, y);
  if (fitting.hand) {
    if (!canLand(x, y)) return;
    if (o) board.remove(o.id);
    if (board.place(fitting.hand, x, y) && board.stock(fitting.hand) === 0) fitting.hand = null;
    return;
  }
  if (o) {
    // Lift the module: it returns to the bay and into the hand.
    board.remove(o.id);
    fitting.hand = o.type;
  }
}

function stow(x: number, y: number) {
  if (fitting.hand) {
    fitting.hand = null;
    return;
  }
  const o = board.occupantAt(x, y);
  if (o) board.remove(o.id);
}

const result = (id: string) => board.layout.value.pieces.get(id);
const toGlobal = (n: number) => n * yard.globalMult.value;
const isHover = (x: number, y: number) => fitting.hover?.x === x && fitting.hover?.y === y;

function label(c: (typeof cells.value)[number]): string {
  const at = `row ${c.y + 1}, column ${c.x + 1}`;
  if (c.occupant) return `${PIECE_BY_ID[c.occupant.type].name}, ${at}`;
  return c.open ? `Socket, ${at}` : `Sealed, ${at}`;
}
</script>

<template>
  <div class="bay" @mouseleave="fitting.hover = null">
    <div class="hull" :style="{ '--w': HULL_W, '--h': HULL_H }">
      <template v-for="c in cells" :key="c.key">
        <div v-if="c.void" class="cell void" />
        <Button
          v-else
          :as="c.open ? 'button' : 'div'"
          :repeat="false"
          class="cell"
          :class="{
            sealed: !c.open,
            open: c.open,
            occupied: !!c.occupant,
            reach: reach.has(c.key),
            source: sources.has(c.key),
            target: isHover(c.x, c.y),
            legal: legalHover && isHover(c.x, c.y),
            plating: fitting.sectionHover === c.section && !c.open,
          }"
          :aria-label="label(c)"
          :data-cell="c.key"
          @click="c.open && press(c.x, c.y)"
          @mouseenter="fitting.hover = { x: c.x, y: c.y }"
          @focus="fitting.hover = { x: c.x, y: c.y }"
          @contextmenu.prevent="stow(c.x, c.y)"
        >
          <span v-if="c.occupant" class="piece" :class="`pc-${c.occupant.type}`">
            <span class="glyph">{{ PIECE_BY_ID[c.occupant.type].glyph }}</span>
            <span v-if="PIECE_BY_ID[c.occupant.type].role === 'weapon'" class="fp hp-num">
              {{ fmt(toGlobal(result(c.occupant.id)?.firepower ?? 0)) }}
            </span>
            <span v-else class="fp worth hp-num"
              >+{{ fmt(toGlobal(result(c.occupant.id)?.marginal ?? 0)) }}</span
            >
          </span>
          <span v-else-if="c.open" class="socket" />
          <span v-else class="seal hp-num">{{ c.section }}</span>
          <span
            v-if="preview && preview.cells.has(c.key)"
            class="delta hp-num"
            :class="{ loss: preview.cells.get(c.key)! < 0 }"
          >
            {{ signed(toGlobal(preview.cells.get(c.key)!)) }}
          </span>
          <span
            v-if="fitting.hand && legalHover && isHover(c.x, c.y)"
            class="ghost"
            :class="`pc-${fitting.hand}`"
          >
            {{ PIECE_BY_ID[fitting.hand].glyph }}
          </span>
        </Button>
      </template>
    </div>
    <div class="solution" :class="{ live: !!preview }">
      <template v-if="preview">
        firing solution
        <strong class="hp-num" :class="{ loss: preview.delta < 0 }"
          >{{ signed(toGlobal(preview.delta)) }} dps</strong
        >
      </template>
      <template v-else-if="fitting.hand">
        fit
        <span class="hp-ink" :class="`pc-${fitting.hand}`">{{
          PIECE_BY_ID[fitting.hand].name
        }}</span>
        into a socket, or over a module to replace it · right-click to let go
      </template>
      <template v-else>click a module to lift it · right-click to stow it in the bay</template>
    </div>
  </div>
</template>

<style scoped>
.bay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.hull {
  display: grid;
  grid-template-columns: repeat(var(--w), var(--cell));
  grid-template-rows: repeat(var(--h), var(--cell));
  gap: 4px;
  padding: 18px;
  background:
    linear-gradient(rgba(35, 57, 75, 0.35) 1px, transparent 1px) 0 0 / 22px 22px,
    linear-gradient(90deg, rgba(35, 57, 75, 0.35) 1px, transparent 1px) 0 0 / 22px 22px,
    var(--hull);
  border: 1px solid var(--hull-seam);
  border-radius: var(--radius-plate);
  box-shadow: inset 0 0 60px rgba(6, 9, 15, 0.85);
}
.cell {
  position: relative;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-plate);
  background: transparent;
  user-select: none;
}
.cell.void {
  pointer-events: none;
}
.cell.sealed {
  border: 1px dashed var(--lattice);
  background: rgba(6, 9, 15, 0.7);
}
.cell.sealed.plating {
  border-color: var(--plasma);
  background: rgba(255, 181, 71, 0.08);
}
.seal {
  color: var(--lattice);
  font-size: 12px;
}
.cell.sealed.plating .seal {
  color: var(--plasma);
}
.cell.open {
  background: var(--hull-plate);
  border-color: var(--lattice);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(111, 211, 232, 0.04);
  animation: plate-in 700ms ease-out both;
}
.cell.open:focus-visible {
  outline: 1px solid var(--readout);
  outline-offset: 1px;
}
.socket {
  width: 10px;
  height: 10px;
  border: 1px solid var(--blueprint-dim);
  transform: rotate(45deg);
}
.cell.reach {
  outline: 2px solid var(--blueprint);
  outline-offset: -2px;
  background: rgba(111, 211, 232, 0.1);
}
.cell.source {
  outline: 2px solid var(--plasma);
  outline-offset: -2px;
}
.cell.target.open {
  border-color: var(--blueprint);
}
.cell.legal {
  border-color: var(--plasma);
}

.piece {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
  place-items: center;
  border-radius: var(--radius-plate);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--pc) 22%, var(--hull-plate)),
    var(--hull-plate)
  );
  border: 1px solid color-mix(in srgb, var(--pc) 60%, transparent);
  color: var(--pc);
  padding: 4px 0 3px;
}
.glyph {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 22px;
  line-height: 1;
}
.fp {
  font-size: 11px;
  color: var(--readout);
}
.fp.worth {
  color: var(--readout-dim);
}

.ghost {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 22px;
  color: color-mix(in srgb, var(--pc) 75%, transparent);
  background: color-mix(in srgb, var(--hull-plate) 88%, transparent);
  border: 1px dashed var(--pc);
  border-radius: var(--radius-plate);
  pointer-events: none;
}
.delta {
  position: absolute;
  top: -8px;
  right: -6px;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 700;
  background: var(--void);
  color: var(--gain);
  border: 1px solid color-mix(in srgb, var(--gain) 50%, transparent);
  pointer-events: none;
  z-index: 2;
}
.delta.loss {
  color: var(--loss);
  border-color: color-mix(in srgb, var(--loss) 50%, transparent);
}
.solution {
  min-height: 22px;
  color: var(--readout-dim);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.solution strong {
  color: var(--gain);
  font-size: 16px;
  margin-left: 6px;
}
.solution strong.loss {
  color: var(--loss);
}

/* A plated cell comes online: the plate settles in from the lattice. */
@keyframes plate-in {
  from {
    opacity: 0;
    transform: scale(0.86);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

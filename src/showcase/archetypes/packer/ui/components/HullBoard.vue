<!--
  HullBoard — the ship in service's hull lattice, and the firing solution. A held module
  hovered over a socket shows every affected cell's dps delta (salvage delta for a
  tractor), and the reach of the module under the pointer is outlined in blueprint;
  hovering a fitted weapon outlines the modules feeding it in plasma. A Fire Director's
  ray follows its facing and stops where the sector's shear cuts it. Keel cells carry a
  centre rule, and light up when a Spinal Lance is in the hand. A module the sector's
  conditions silence is hatched in breach red.

  Fitting grammar: click a socket to fit the held module; click a fitted module to lift it
  into the hand; click a held module over a different one to replace it, sending the old
  one to the bay; right-click stows a fitted module, or lets go of the held one. R or the
  mouse wheel turns a held or hovered Fire Director.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import {
  CONDITION_BY_ID,
  DIRECTOR_REACH,
  HULL_H,
  HULL_W,
  PIECE_BY_ID,
  sectionAt,
  tagsAt,
  type PieceId,
} from '../../data';
import { cellKey, getBoard, getFleet, getYard, type Placed } from '../../modules';
import { FACING_NAMES, useFitting } from '../fitting';
import { cell, signed, signedCell } from '../format';
import { silencedBy } from '../ship';

const board = getBoard();
const yard = getYard();
const fleet = getFleet();
const fitting = useFitting();

/** Rows and columns of the map with any hull in them: the lattice is drawn to the ship's shape. */
const frame = computed(() => {
  const ship = fleet.ship.value;
  let x0 = HULL_W;
  let x1 = -1;
  let y0 = HULL_H;
  let y1 = -1;
  for (let y = 0; y < HULL_H; y++)
    for (let x = 0; x < HULL_W; x++)
      if (sectionAt(ship, x, y) >= 0) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x0, x1, y0, y1 };
});

// The occupancy grid is not reactive; reading `placed` subscribes each derivation to the board.
const cells = computed(() => {
  void board.placed.value;
  void board.openCells.value;
  const ship = fleet.ship.value;
  const { x0, x1, y0, y1 } = frame.value;
  const out = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const section = sectionAt(ship, x, y);
      out.push({
        x,
        y,
        key: cellKey(x, y),
        void: section < 0,
        section,
        keel: tagsAt(ship, x, y).includes('keel'),
        open: board.isOpen(x, y),
        occupant: board.occupantAt(x, y),
      });
    }
  return out;
});

/** What the pointer is asking about: a held module at the hovered cell, or the hovered module itself. */
const focus = computed<{
  type: PieceId;
  x: number;
  y: number;
  facing: number;
  hypothetical: boolean;
} | null>(() => {
  void board.placed.value;
  const h = fitting.hover;
  if (!h) return null;
  if (fitting.hand)
    return { type: fitting.hand, x: h.x, y: h.y, facing: fitting.facing, hypothetical: true };
  const o = board.occupantAt(h.x, h.y);
  return o ? { type: o.type, x: o.x, y: o.y, facing: o.facing, hypothetical: false } : null;
});

/** Cells the focused module reaches, and the ray cells the sector's shear cuts off. */
const reach = computed(() => {
  const f = focus.value;
  const live = new Set<string>();
  const cut = new Set<string>();
  if (!f) return { live, cut };
  const ray = PIECE_BY_ID[f.type].relation === 'ray';
  const range = board.params.value.rayRange;
  board.reach(f.type, f.x, f.y, f.facing).forEach((c, i) => {
    if (sectionAt(fleet.ship.value, c.x, c.y) < 0) return;
    if (!ray || i < range) live.add(cellKey(c.x, c.y));
    else if (i < DIRECTOR_REACH) cut.add(cellKey(c.x, c.y));
  });
  return { live, cut };
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

/** A held module may land on an empty socket that takes it, or replace a different module. */
function canLand(x: number, y: number): boolean {
  if (!fitting.hand) return false;
  const o = board.occupantAt(x, y);
  if (!o) return board.canPlace(fitting.hand, x, y);
  return (
    o.type !== fitting.hand && board.stock(fitting.hand) > 0 && board.takes(fitting.hand, x, y)
  );
}

const legalHover = computed(() => {
  void board.placed.value;
  const h = fitting.hover;
  return !!(h && canLand(h.x, h.y));
});

/** A Spinal Lance in the hand: every socket that is not keel is refused. */
const keelOnly = computed(() => !!fitting.hand && PIECE_BY_ID[fitting.hand].mount === 'keel');

const preview = computed(() => {
  const h = fitting.hover;
  if (!fitting.hand || !h || !legalHover.value) return null;
  const p = board.preview(fitting.hand, h.x, h.y, fitting.facing);
  // A tractor adds no firepower; its worth is the salvage it raises.
  const bySalvage = PIECE_BY_ID[fitting.hand].role === 'tractor';
  return { ...p, shown: bySalvage ? p.salvageCells : p.cells, bySalvage };
});

/** Salvage changes too when tractors are on the board, or one is in the hand. */
const showSalvage = computed(
  () => !!preview.value && Math.abs(preview.value.salvageDelta - preview.value.delta) > 1e-9,
);

const silenced = computed(() => {
  const m = new Map<string, ReturnType<typeof silencedBy>>();
  const conds = fleet.conditions.value;
  if (!conds.length) return m;
  void board.openCells.value;
  for (const p of board.placed.value) {
    const s = silencedBy(p, conds);
    if (s) m.set(p.id, s);
  }
  return m;
});

function press(x: number, y: number) {
  const o = board.occupantAt(x, y);
  if (fitting.hand) {
    if (!canLand(x, y)) return;
    if (o) board.remove(o.id);
    if (board.place(fitting.hand, x, y, fitting.facing) && board.stock(fitting.hand) === 0)
      fitting.hand = null;
    return;
  }
  if (o) {
    // Lift the module: it returns to the bay and into the hand, still facing where it did.
    board.remove(o.id);
    fitting.hand = o.type;
    fitting.facing = o.facing;
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

/** The wheel turns a held or hovered Fire Director; anything else scrolls the page. */
function wheel(e: WheelEvent) {
  const turnHeld = !!fitting.hand && !!PIECE_BY_ID[fitting.hand].turns;
  const h = fitting.hover;
  const o = !fitting.hand && h ? board.occupantAt(h.x, h.y) : null;
  if (!turnHeld && !(o && PIECE_BY_ID[o.type].turns)) return;
  e.preventDefault();
  const steps = e.deltaY > 0 ? 1 : 3;
  if (turnHeld) fitting.facing = (fitting.facing + steps) % 4;
  else for (let i = 0; i < steps; i++) board.turn(o!.id);
}

const result = (id: string) => board.layout.value.pieces.get(id);
const toGlobal = (n: number) => n * yard.globalMult.value;
const isHover = (x: number, y: number) => fitting.hover?.x === x && fitting.hover?.y === y;
const turns = (type: PieceId) => !!PIECE_BY_ID[type].turns;

function label(c: (typeof cells.value)[number]): string {
  const at = `row ${c.y + 1}, column ${c.x + 1}`;
  const keel = c.keel ? ' (keel)' : '';
  if (c.occupant) {
    const facing = turns(c.occupant.type) ? `, facing ${FACING_NAMES[c.occupant.facing]}` : '';
    return `${PIECE_BY_ID[c.occupant.type].name}${facing}, ${at}${keel}`;
  }
  return c.open ? `Socket, ${at}${keel}` : `Sealed, ${at}`;
}

const silenceTag = (p: Placed) => {
  const s = silenced.value.get(p.id);
  return s ? CONDITION_BY_ID[s.by].name : '';
};
</script>

<template>
  <div class="bay" @mouseleave="fitting.hover = null">
    <div
      class="hull"
      :class="[`ship-${fleet.ship.value}`, { 'keel-only': keelOnly }]"
      :style="{ '--w': frame.x1 - frame.x0 + 1, '--h': frame.y1 - frame.y0 + 1 }"
      @wheel="wheel"
    >
      <template v-for="c in cells" :key="c.key">
        <div v-if="c.void" class="cell void" />
        <Button
          v-else
          :as="c.open ? 'button' : 'div'"
          class="cell"
          :class="{
            sealed: !c.open,
            open: c.open,
            keel: c.keel,
            occupied: !!c.occupant,
            reach: reach.live.has(c.key),
            cut: reach.cut.has(c.key),
            source: sources.has(c.key),
            target: isHover(c.x, c.y),
            legal: legalHover && isHover(c.x, c.y),
            refused: keelOnly && c.open && !c.keel,
            plating: fitting.sectionHover === c.section && !c.open,
          }"
          :aria-label="label(c)"
          :data-cell="c.key"
          @click="c.open && press(c.x, c.y)"
          @mouseenter="fitting.hover = { x: c.x, y: c.y }"
          @focus="fitting.hover = { x: c.x, y: c.y }"
          @contextmenu.prevent="stow(c.x, c.y)"
        >
          <span
            v-if="c.occupant"
            class="piece"
            :class="[
              `pc-${c.occupant.type}`,
              {
                dark: silenced.get(c.occupant.id)?.dark,
                weak: silenced.get(c.occupant.id) && !silenced.get(c.occupant.id)!.dark,
              },
            ]"
            :title="silenceTag(c.occupant)"
          >
            <span class="glyph">{{ PIECE_BY_ID[c.occupant.type].glyph }}</span>
            <span v-if="PIECE_BY_ID[c.occupant.type].role === 'weapon'" class="fp hp-num">
              {{ cell(toGlobal(result(c.occupant.id)?.firepower ?? 0)) }}
            </span>
            <span v-else-if="c.occupant.type === 'tractor'" class="fp worth hp-num">{{
              signedCell(toGlobal(result(c.occupant.id)?.salvageMarginal ?? 0))
            }}</span>
            <span v-else class="fp worth hp-num">{{
              signedCell(toGlobal(result(c.occupant.id)?.marginal ?? 0))
            }}</span>
            <span
              v-if="turns(c.occupant.type)"
              class="aim"
              :style="{ '--turn': `${c.occupant.facing * 90}deg` }"
              aria-hidden="true"
            />
          </span>
          <span v-else-if="c.open" class="socket" />
          <span v-else class="seal hp-num">{{ c.section.toString(36).toUpperCase() }}</span>
          <span
            v-if="preview && preview.shown.has(c.key)"
            class="delta hp-num"
            :class="{ loss: preview.shown.get(c.key)! < 0, salvage: preview.bySalvage }"
          >
            {{ signedCell(toGlobal(preview.shown.get(c.key)!)) }}
          </span>
          <span
            v-if="fitting.hand && legalHover && isHover(c.x, c.y)"
            class="ghost"
            :class="`pc-${fitting.hand}`"
          >
            {{ PIECE_BY_ID[fitting.hand].glyph }}
            <span
              v-if="turns(fitting.hand)"
              class="aim"
              :style="{ '--turn': `${fitting.facing * 90}deg` }"
              aria-hidden="true"
            />
          </span>
        </Button>
      </template>
    </div>
    <div class="solution" :class="{ live: !!preview }">
      <template v-if="preview">
        firing solution
        <strong class="hp-num" :class="{ loss: preview.delta < 0, flat: preview.delta === 0 }"
          >{{ signed(toGlobal(preview.delta)) }} dps</strong
        >
        <strong
          v-if="showSalvage"
          class="hp-num salvage"
          :class="{ loss: preview.salvageDelta < 0 }"
          >{{ signed(toGlobal(preview.salvageDelta)) }} salvage/s</strong
        >
      </template>
      <template v-else-if="fitting.hand">
        fit
        <span class="hp-ink" :class="`pc-${fitting.hand}`">{{
          PIECE_BY_ID[fitting.hand].name
        }}</span>
        <template v-if="keelOnly"> on the keel</template>
        <template v-if="turns(fitting.hand)">
          facing {{ FACING_NAMES[fitting.facing] }} · <kbd>R</kbd> or wheel turns it</template
        >
        · right-click lets go
      </template>
      <template v-else>click a module to lift it · right-click stows it in the bay</template>
    </div>
  </div>
</template>

<style scoped>
.bay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.hull {
  /* The lattice fits the deck's height: thirteen rows on a lancer, fewer on a frigate. */
  --cell: clamp(36px, calc((100vh - 410px) / var(--h) - 4px), 58px);
  display: grid;
  grid-template-columns: repeat(var(--w), var(--cell));
  grid-template-rows: repeat(var(--h), var(--cell));
  gap: 4px;
  padding: 16px;
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
/* The keel: a centre rule down the plate, the one cell a spinal mount sits on. */
.cell.keel {
  background-image: linear-gradient(
    90deg,
    transparent calc(50% - 1px),
    var(--keel-rule) calc(50% - 1px),
    var(--keel-rule) calc(50% + 1px),
    transparent calc(50% + 1px)
  );
}
.cell.open.keel {
  background-color: var(--keel-plate);
}
.keel-only .cell.open.keel:not(.occupied) {
  border-color: var(--pc-lance);
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--pc-lance) 18%, transparent);
}
.cell.refused {
  opacity: 0.35;
  cursor: not-allowed;
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
  background: var(--hull-plate);
}
.cell.reach {
  outline: 2px solid var(--blueprint);
  outline-offset: -2px;
  background-color: rgba(111, 211, 232, 0.1);
}
/* A ray cell the sector's shear cut off: the reach it would have had. */
.cell.cut {
  outline: 2px dashed color-mix(in srgb, var(--breach) 70%, transparent);
  outline-offset: -2px;
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
  position: relative;
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
  padding: 3px 0 2px;
}
/* Silenced by the sector: hatched in breach red, the glyph gone cold. */
.piece.dark {
  background:
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--breach) 13%, transparent) 0 1px,
      transparent 1px 6px
    ),
    var(--hull);
  border-color: color-mix(in srgb, var(--breach) 32%, var(--hull-seam));
  color: color-mix(in srgb, var(--pc) 35%, var(--slag));
}
.piece.dark .fp {
  color: var(--slag);
}
.piece.weak::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 6px;
  height: 6px;
  background: var(--breach);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
.glyph {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: calc(var(--cell) * 0.38);
  line-height: 1;
}
.fp {
  font-size: 11px;
  color: var(--readout);
}
.fp.worth {
  color: var(--readout-dim);
}
/* A director's facing: a chevron at the edge it fires from. */
.aim {
  position: absolute;
  inset: 0;
  transform: rotate(var(--turn));
  pointer-events: none;
}
.aim::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 5px;
  margin-left: -5px;
  background: var(--pc);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.ghost {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: calc(var(--cell) * 0.38);
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
.delta.salvage {
  color: var(--pc-tractor);
  border-color: color-mix(in srgb, var(--pc-tractor) 50%, transparent);
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
  text-align: center;
}
.solution strong {
  color: var(--gain);
  font-size: 16px;
  margin-left: 6px;
}
.solution strong.flat {
  color: var(--readout-dim);
}
.solution strong.salvage {
  color: var(--pc-tractor);
}
.solution strong.loss {
  color: var(--loss);
}
kbd {
  font-family: var(--face-stencil);
  font-weight: 600;
  padding: 0 4px;
  border: 1px solid var(--hull-seam);
  border-radius: 2px;
  color: var(--readout);
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

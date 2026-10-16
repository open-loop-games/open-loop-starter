<!--
  Fabricator — one schematic per recovered module type: its relation, the copies waiting
  in the bay, and the price of the next. Fabricating puts a copy in the bay and in the
  hand; clicking a schematic with copies in the bay takes one into the hand, or lets go of
  it. The next schematic still encrypted shows how far salvage has come toward it.

  Each schematic is a ProducerList row over its fabricator purchasable, drawn in the `#row`
  slot. The row has no rate, because a module produces nothing until it is fitted; the bay
  count beside it is the board's, the copies fabricated and not yet fitted.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ProducerList, createPurchasableRow } from '@/ui/compositions';
import { PIECES, unlockGate, type PieceDef } from '../../data';
import { getBoard, getFleet, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt } from '../format';

const yard = getYard();
const board = getBoard();
const fleet = getFleet();
const fitting = useFitting();

const rows = PIECES.map((def) =>
  createPurchasableRow(yard.fabricator.getPurchasable(def.id)!, {
    id: def.id,
    displayName: def.name,
    purchase: () => fabricate(def),
    extra: def,
  }),
);

/** The next schematic still encrypted: the one locked module the bay hints at. */
// TODO(expansion): progress toward a cumulative-gte Gate as a fraction. The threshold is re-read
// from the spine rather than from the Gate the fabricator registered.
// A schematic decrypts only on the ship its beat belongs to, so only this ship's are hinted.
const nextLocked = computed(() => {
  const ship = fleet.ship.value;
  const def = PIECES.find(
    (p) => p.unlock && p.unlock.startsWith(`${ship}:`) && !yard.unlocked(p.id),
  );
  if (!def) return null;
  const gate = unlockGate(def.unlock!);
  return { def, gate, progress: Math.min(1, yard.shipEarned() / gate) };
});

function fabricate(def: PieceDef) {
  const fab = yard.fabricator.getPurchasable(def.id)!;
  if (fab.purchase(1)) fitting.hand = def.id;
}

function hold(def: PieceDef) {
  if (board.stock(def.id) > 0) fitting.hand = fitting.hand === def.id ? null : def.id;
}
</script>

<template>
  <section class="fabricator">
    <h2 class="hp-head">Fabricator</h2>
    <ProducerList :rows="rows" bulk-mode-source="none">
      <template #row="{ row, pendingCost, purchase }">
        <div
          class="schematic"
          :class="[
            `pc-${row.id}`,
            { held: fitting.hand === row.id, stocked: board.stock(row.extra!.id) > 0 },
          ]"
        >
          <Button
            class="pick"
            :disabled="board.stock(row.extra!.id) === 0"
            :aria-pressed="fitting.hand === row.id"
            :aria-label="`Hold ${row.displayName}`"
            @click="hold(row.extra!)"
          >
            <span class="tile">{{ row.extra!.glyph }}</span>
            <span class="body">
              <span class="name">{{ row.displayName }}</span>
              <span class="rel hp-ink">{{ row.extra!.relationName }}</span>
              <span class="blurb">{{ row.extra!.blurb }}</span>
            </span>
          </Button>
          <div class="side">
            <span class="bay hp-num" :class="{ empty: board.stock(row.extra!.id) === 0 }"
              >bay {{ board.stock(row.extra!.id) }}</span
            >
            <Button
              class="hp-act"
              :class="{ can: row.canPurchase(1) }"
              :disabled="!row.canPurchase(1)"
              :aria-label="`Fabricate ${row.displayName} for ${fmt(pendingCost!)} salvage`"
              @click="purchase"
            >
              {{ fmt(pendingCost!) }}
            </Button>
          </div>
        </div>
      </template>
    </ProducerList>
    <div v-if="nextLocked" class="schematic encrypted">
      <span class="pick">
        <span class="tile">?</span>
        <span class="body">
          <span class="name">Encrypted schematic</span>
          <span class="rel">decrypts as salvage comes in</span>
          <ProgressBar class="meter" :value="nextLocked.progress" />
        </span>
      </span>
      <div class="side">
        <span class="bay hp-num">{{ fmt(nextLocked.gate) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.schematic {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: var(--hull);
  border: 1px solid var(--hull-seam);
  border-left: 3px solid var(--pc, var(--hull-seam));
  border-radius: var(--radius-plate);
  animation: hp-decrypt 600ms ease-out both;
}
.schematic.held {
  border-color: var(--pc);
  background: color-mix(in srgb, var(--pc) 10%, var(--hull));
}
.pick {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: default;
}
.stocked .pick {
  cursor: pointer;
}
.pick:focus-visible {
  outline: 1px solid var(--blueprint);
  outline-offset: 3px;
}
.tile {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 22px;
  color: var(--pc);
  border: 1px solid color-mix(in srgb, var(--pc) 55%, transparent);
  border-radius: var(--radius-plate);
  background: color-mix(in srgb, var(--pc) 12%, var(--hull-plate));
}
.body {
  display: flex;
  flex-direction: column;
}
.name {
  font-family: var(--face-stencil);
  font-weight: 600;
  font-size: 14px;
  color: var(--readout);
}
.rel {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.blurb {
  font-size: 12px;
  color: var(--readout-dim);
  margin-top: 2px;
}
.side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.bay {
  font-size: 12px;
  color: var(--readout);
}
.bay.empty {
  color: var(--slag);
}
.encrypted {
  --pc: var(--blueprint-dim);
  border-style: dashed;
  animation: none;
}
.encrypted .rel {
  color: var(--readout-dim);
}
.encrypted {
  margin-top: 6px;
}
.meter {
  --progress-bar-height: 3px;
  --progress-bar-track: var(--hull-seam);
  --progress-bar-track-empty: var(--hull-seam);
  --progress-bar-fill: var(--blueprint);
  --progress-bar-fill-full: var(--blueprint);
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-radius: 0;
  --progress-bar-transition: none;
  margin-top: 6px;
}
</style>

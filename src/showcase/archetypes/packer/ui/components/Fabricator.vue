<!--
  Fabricator — one schematic per recovered module type: its relation, the copies waiting
  in the bay, and the price of the next. Fabricating puts a copy in the bay and in the
  hand; clicking a schematic with copies in the bay takes one into the hand, or lets go of
  it. The next schematic still encrypted shows how far salvage has come toward it.

  Declines ProducerList: its row contract requires a rate, and a fabricated module
  produces nothing until it is fitted, so the row has no rate to show.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { PIECES, unlockGate, type PieceDef } from '../../data';
import { getBoard, getFleet, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt } from '../format';

const yard = getYard();
const board = getBoard();
const fleet = getFleet();
const fitting = useFitting();

const rows = computed(() =>
  PIECES.filter((p) => yard.unlocked(p.id)).map((def) => {
    const fab = yard.fabricator.getPurchasable(def.id)!;
    return {
      def,
      price: toNumber(fab.getCost(1)),
      afford: fab.canPurchase.value,
      stock: board.stock(def.id),
    };
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
  if (Decimal.gt(fab.purchase(1), 0)) fitting.hand = def.id;
}

function hold(def: PieceDef) {
  if (board.stock(def.id) > 0) fitting.hand = fitting.hand === def.id ? null : def.id;
}
</script>

<template>
  <section class="fabricator">
    <h2 class="hp-head">Fabricator</h2>
    <ul>
      <li
        v-for="r in rows"
        :key="r.def.id"
        class="schematic"
        :class="[`pc-${r.def.id}`, { held: fitting.hand === r.def.id, stocked: r.stock > 0 }]"
      >
        <Button
          class="pick"
          :repeat="false"
          :disabled="r.stock === 0"
          :aria-pressed="fitting.hand === r.def.id"
          :aria-label="`Hold ${r.def.name}`"
          @click="hold(r.def)"
        >
          <span class="tile">{{ r.def.glyph }}</span>
          <span class="body">
            <span class="name">{{ r.def.name }}</span>
            <span class="rel hp-ink">{{ r.def.relationName }}</span>
            <span class="blurb">{{ r.def.blurb }}</span>
          </span>
        </Button>
        <div class="side">
          <span class="bay hp-num" :class="{ empty: r.stock === 0 }">bay {{ r.stock }}</span>
          <Button
            class="hp-act"
            :class="{ can: r.afford }"
            :disabled="!r.afford"
            :aria-label="`Fabricate ${r.def.name} for ${fmt(r.price)} salvage`"
            @click="fabricate(r.def)"
          >
            {{ fmt(r.price) }}
          </Button>
        </div>
      </li>
      <li v-if="nextLocked" :key="nextLocked.def.id" class="schematic encrypted">
        <span class="pick">
          <span class="tile">?</span>
          <span class="body">
            <span class="name">Encrypted schematic</span>
            <span class="rel">decrypts as salvage comes in</span>
            <span class="meter"
              ><span class="fill" :style="{ transform: `scaleX(${nextLocked.progress})` }"
            /></span>
          </span>
        </span>
        <div class="side">
          <span class="bay hp-num">{{ fmt(nextLocked.gate) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
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
.meter {
  display: block;
  margin-top: 6px;
  height: 3px;
  background: var(--hull-seam);
  overflow: hidden;
}
.meter .fill {
  display: block;
  height: 100%;
  background: var(--blueprint);
  transform-origin: left;
}
</style>

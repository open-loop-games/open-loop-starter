<!--
  WorkRail — the day's work: the tool a click on the rock uses (haul, a piece, take up),
  hauling every net, mending the tower, the finds the tide left at dawn, and the boat to a
  wreck sighted offshore. It locks at dusk, and while the keeper is out in the boat; the
  night has only the hour band's shore-up.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { FINDS, PIECES } from '../../data';
import { cellKey, getWatch } from '../../modules';
import { n, type Tool } from '../format';
import PieceGlyph from './PieceGlyph.vue';

const tool = defineModel<Tool>('tool', { required: true });
const watch = getWatch();
const day = computed(() => watch.phase.value === 'day');
const atWork = computed(() => day.value && watch.home.value);
const boatLine = computed(() => {
  if (watch.boat.value === 'returning') return 'Rowing home with the haul.';
  if (watch.boat.value === 'out')
    return watch.wreck.value > 0 ? 'Out at the wreck, stripping it.' : 'The wreck is stripped.';
  return 'A wreck is sighted offshore.';
});
const salvage = computed(() => toNumber(watch.salvage.value));

const pieces = computed(() =>
  PIECES.map((def) => {
    const price = watch.priceOf(def.id);
    return {
      def,
      price,
      owned: watch.placed.value.filter((p) => p.kind === def.id).length,
      affordable: salvage.value >= price,
    };
  }),
);

const missing = computed(() =>
  Math.max(0, watch.integrityMax.value - toNumber(watch.integrity.value)),
);
const mendStep = computed(() => Math.min(missing.value, watch.integrityMax.value * 0.25));
const heldTotal = computed(() =>
  watch.placed.value
    .filter((p) => p.kind === 'net')
    .reduce((a, p) => a + toNumber(watch.tideline.get(cellKey(p.x, p.y))), 0),
);
const offer = computed(() => watch.offer.value.map((id) => FINDS.find((f) => f.id === id)!));

function pick(t: Tool): void {
  tool.value = tool.value === t ? 'haul' : t;
}
</script>

<template>
  <section class="rail" :class="{ locked: !atWork }">
    <h2 class="sk-title">
      The day's work <small v-if="!day">build and haul by daylight only</small>
    </h2>

    <div class="tools">
      <Button
        class="sk-control tool plain"
        :class="{ on: tool === 'haul' }"
        :repeat="false"
        @click="pick('haul')"
      >
        <span class="name">Haul</span>
        <span class="price num">{{ Math.floor(heldTotal) }} on the line</span>
      </Button>
      <Button
        v-for="p in pieces"
        :key="p.def.id"
        class="sk-control tool"
        :class="{ on: tool === p.def.id, afford: p.affordable && day, short: !p.affordable }"
        :data-piece="p.def.id"
        :title="p.def.blurb"
        :repeat="false"
        @click="pick(p.def.id)"
      >
        <PieceGlyph :kind="p.def.id" class="mini" />
        <span class="name">{{ p.def.name }}</span>
        <span class="price num">{{ n(Math.ceil(p.price)) }}</span>
        <span class="owned num">{{ p.owned }} on the {{ p.def.ground }}</span>
      </Button>
      <Button
        class="sk-control tool plain"
        :class="{ on: tool === 'clear' }"
        title="Take a piece up; its price comes back in full."
        :repeat="false"
        @click="pick('clear')"
      >
        <span class="name">Take up</span>
        <span class="price">full refund</span>
      </Button>
    </div>

    <div class="actions">
      <Button
        class="sk-control act"
        :class="{ afford: atWork && heldTotal >= 1 }"
        :disabled="!atWork || heldTotal < 1"
        :repeat="false"
        @click="watch.haulAll()"
      >
        Haul every net
      </Button>
      <Button
        class="sk-control act"
        :class="{ afford: day && missing > 0 && salvage >= watch.repairCost(mendStep) }"
        :disabled="!atWork || missing < 0.5"
        @click="watch.mend(mendStep)"
      >
        Mend <span class="num">{{ mendStep.toFixed(0) }}</span> ·
        <span class="num">{{ n(watch.repairCost(mendStep)) }}</span>
      </Button>
    </div>

    <div v-if="offer.length && atWork" class="finds" aria-label="Washed up at dawn">
      <div class="finds-head">Washed up at dawn. Take one; the tide has the rest by dusk.</div>
      <div class="find-row">
        <Button
          v-for="f in offer"
          :key="f.id"
          class="sk-control find"
          :data-find="f.id"
          :repeat="false"
          @click="watch.take(f.id)"
        >
          <span class="name">{{ f.name }}</span>
          <span class="blurb">{{ f.blurb }}</span>
        </Button>
      </div>
    </div>

    <div
      v-if="day && (watch.wreck.value > 0 || !watch.home.value)"
      class="boat"
      aria-label="The boat"
    >
      <div class="boat-head">
        <span>{{ boatLine }}</span>
        <span class="num"
          >{{ n(watch.boatHaul.value) }} aboard · {{ n(watch.wreck.value) }} left in her</span
        >
      </div>
      <div class="boat-note">
        Away, the keeper can't haul, build or mend. Out at dusk, there's no shoring that night.
      </div>
      <Button
        v-if="watch.home.value"
        class="sk-control act afford"
        data-testid="row-out"
        :repeat="false"
        @click="watch.rowOut()"
      >
        Row out to the wreck
      </Button>
      <Button
        v-else-if="watch.boat.value === 'out'"
        class="sk-control act afford"
        data-testid="row-home"
        :repeat="false"
        @click="watch.rowHome()"
      >
        Row home
      </Button>
    </div>
  </section>
</template>

<style scoped>
.tools {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.tool {
  display: grid;
  grid-template-columns: 24px 1fr;
  column-gap: 6px;
  text-align: left;
  padding: 6px 8px;
  min-height: 52px;
  color: var(--sk-foam);
}
.tool.plain {
  grid-template-columns: 1fr;
}
.mini {
  grid-row: 1 / span 3;
  width: 24px;
  height: 24px;
  align-self: center;
}
.name {
  font-family: var(--sk-chart);
  font-size: 12px;
}
.price {
  font-size: 13px;
  color: var(--sk-overcast);
}
.owned {
  font-size: 11px;
  color: var(--sk-overcast);
}
.tool.afford .price {
  color: var(--sk-lamp);
}
.tool.short .name {
  color: var(--sk-overcast);
}
.locked .tool:not(.plain) {
  opacity: 0.55;
}
.actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.act {
  flex: 1;
  padding: 7px 10px;
}
.act.afford {
  color: var(--sk-lamp);
}
.finds {
  margin-top: 12px;
  padding: 10px;
  border: 1px solid rgba(184, 149, 90, 0.5);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(138, 109, 59, 0.18), rgba(138, 109, 59, 0.05));
  animation: washed-up 0.9s ease-out;
}
@keyframes washed-up {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }
}
.boat {
  margin-top: 12px;
  padding: 10px;
  border: 1px solid rgba(93, 138, 110, 0.5);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(93, 138, 110, 0.14), rgba(93, 138, 110, 0.04));
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.boat-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--sk-kelp);
}
.boat-note {
  font-size: 12px;
  color: var(--sk-overcast);
}
.finds-head {
  font-size: 13px;
  color: var(--sk-brass);
  margin-bottom: 6px;
}
.find-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.find {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 8px;
  background: rgba(11, 19, 29, 0.55);
}
.find:hover {
  border-color: var(--sk-lamp);
}
.find .name {
  color: var(--sk-lamp);
}
.find .blurb {
  font-size: 12px;
  color: var(--sk-foam);
  opacity: 0.8;
}
</style>

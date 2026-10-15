<!--
  FireControl — the fitted module under the pointer, read out. A weapon's firepower is laid
  out as its expression, base dps × (1 + links) × (1 + stamps) × the fire stack, with each
  term named by the module that gives it; tractors then raise what it recovers, so its
  salvage is a second line. A booster, beacon, manifold or tractor reads as what pulling it
  would cost. A module the sector silences says which condition did it. The fire stack's
  three factors (refits, honours, calibration) are always listed beneath.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import { CALIBRATION_STEP, CONDITION_BY_ID, PIECE_BY_ID } from '../../data';
import { getBoard, getFleet, getYard, type WeaponId } from '../../modules';
import { FACING_NAMES, useFitting } from '../fitting';
import { fmt, times } from '../format';
import { silencedBy } from '../ship';

const board = getBoard();
const yard = getYard();
const fleet = getFleet();
const fitting = useFitting();

const inspected = computed(() => {
  void board.placed.value;
  if (fitting.hand || !fitting.hover) return null;
  const o = board.occupantAt(fitting.hover.x, fitting.hover.y);
  if (!o) return null;
  const r = board.layout.value.pieces.get(o.id);
  if (!r) return null;
  const def = PIECE_BY_ID[o.type];
  const sum = (kind: 'link' | 'stamp' | 'yield') =>
    r.terms.filter((t) => t.kind === kind).reduce((n, t) => n + t.value, 0);
  const silenced = silencedBy(o, fleet.conditions.value);
  return {
    o,
    def,
    r,
    dps: def.role === 'weapon' ? board.params.value.dps[o.type as WeaponId] : 0,
    linkSum: sum('link'),
    stampSum: sum('stamp'),
    yieldSum: sum('yield'),
    silenced: silenced && { ...silenced, name: CONDITION_BY_ID[silenced.by].name },
  };
});

const stack = computed(() => {
  const honours = fleet.honourMult.value;
  const calibration = Math.pow(
    CALIBRATION_STEP,
    toNumber(yard.calibration.getPurchasable('calibration')!.count.value),
  );
  const total = yard.globalMult.value;
  return { total, honours, calibration, refits: total / (honours * calibration) };
});
const g = computed(() => stack.value.total);
</script>

<template>
  <section class="fire-control">
    <h2 class="hp-head">Fire control</h2>
    <div class="inspector">
      <template v-if="inspected">
        <div class="title hp-ink" :class="`pc-${inspected.def.id}`">
          {{ inspected.def.name }}
          <span v-if="inspected.def.turns" class="facing"
            >faces {{ FACING_NAMES[inspected.o.facing] }} · R turns</span
          >
        </div>
        <p v-if="inspected.silenced" class="silenced">
          {{ inspected.silenced.name }}:
          {{ inspected.silenced.dark ? 'gives nothing this sector' : 'gives less this sector' }}
        </p>
        <template v-if="inspected.def.role === 'weapon'">
          <div class="expr hp-num">
            <span>{{ fmt(inspected.dps) }} dps</span>
            <span class="op">×</span>
            <span class="hp-ink pc-capacitor">(1 + {{ fmt(inspected.linkSum, 2) }})</span>
            <template v-if="yard.unlocked('beacon')">
              <span class="op">×</span>
              <span class="hp-ink pc-beacon">(1 + {{ fmt(inspected.stampSum, 2) }})</span>
            </template>
            <span class="op">×</span>
            <span>{{ fmt(g, 2) }}</span>
            <span class="op">=</span>
            <strong>{{ fmt(inspected.r.firepower * g) }}</strong>
          </div>
          <div v-if="yard.unlocked('tractor')" class="expr salvage hp-num">
            <span>salvage</span>
            <span class="op">×</span>
            <span class="hp-ink pc-tractor">(1 + {{ fmt(inspected.yieldSum, 2) }})</span>
            <span class="op">=</span>
            <strong>{{ fmt(inspected.r.salvage * g) }}/s</strong>
          </div>
          <ul class="terms hp-num">
            <li
              v-for="t in inspected.r.terms"
              :key="t.fromId + t.kind"
              class="hp-ink"
              :class="`pc-${t.fromType}`"
            >
              {{ PIECE_BY_ID[t.fromType].name }} <span>+{{ fmt(t.value, 2) }}</span>
            </li>
            <li v-if="!inspected.r.terms.length" class="none">nothing reaches this mount</li>
          </ul>
        </template>
        <p v-else-if="inspected.def.role === 'tractor'" class="worth hp-num">
          Pulling it costs
          <strong class="salvage">{{ fmt(inspected.r.salvageMarginal * g) }} salvage/s</strong>
        </p>
        <p v-else class="worth hp-num">
          Pulling it costs
          <strong>{{ fmt(inspected.r.marginal * g) }} dps</strong>
          <template v-if="inspected.def.role === 'booster' && inspected.r.amp > 1">
            · cooled {{ times(inspected.r.amp) }}</template
          >
        </p>
      </template>
      <p v-else class="hint">Hover a fitted module to read its firing solution.</p>
    </div>
    <dl class="stack hp-num">
      <div>
        <dt>fire stack</dt>
        <dd class="total">{{ times(stack.total) }}</dd>
      </div>
      <div>
        <dt>refits</dt>
        <dd>{{ times(stack.refits) }}</dd>
      </div>
      <div>
        <dt>honours</dt>
        <dd class="honour">{{ times(stack.honours) }}</dd>
      </div>
      <div v-if="fleet.lineOpen.value">
        <dt>calibration</dt>
        <dd>{{ times(stack.calibration) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.inspector {
  min-height: 150px;
  padding: 10px 12px;
  background: var(--hull);
  border: 1px solid var(--hull-seam);
  border-radius: var(--radius-plate);
}
.title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 6px;
}
.facing {
  font-family: var(--face-manual);
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--readout-dim);
}
.silenced {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--breach);
}
.expr {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  font-size: 14px;
}
.expr.salvage {
  margin-top: 2px;
  font-size: 13px;
  color: var(--readout-dim);
}
.expr .op {
  color: var(--readout-dim);
}
.expr strong {
  color: var(--plasma);
  font-size: 18px;
}
.expr.salvage strong,
strong.salvage {
  color: var(--pc-tractor);
  font-size: 15px;
}
.terms {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-size: 12px;
}
.terms li {
  display: flex;
  justify-content: space-between;
}
.terms li span {
  color: var(--readout);
}
.terms .none {
  color: var(--slag);
}
.worth {
  margin: 0;
}
.worth strong {
  color: var(--plasma);
}
.hint {
  color: var(--readout-dim);
  font-size: 12px;
  margin: 0;
}
.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 6px 2px 0;
  font-size: 12px;
}
.stack div {
  display: flex;
  white-space: nowrap;
  gap: 4px;
  align-items: baseline;
}
.stack dt {
  color: var(--readout-dim);
}
.stack dd {
  margin: 0;
  color: var(--readout);
}
.stack .total {
  color: var(--plasma);
  font-weight: 700;
}
.stack .honour {
  color: var(--honour);
}
</style>

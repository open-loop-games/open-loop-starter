<!--
  FireControl — the fitted module under the pointer, read out. A weapon's firepower is laid
  out as its expression, base dps × (1 + links) × (1 + stamps) × the refit stack, with each
  term named by the module that gives it; a booster, beacon or manifold reads as the dps
  pulling it would cost.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { PIECE_BY_ID } from '../../data';
import { getBoard, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt, times } from '../format';

const board = getBoard();
const yard = getYard();
const fitting = useFitting();

const inspected = computed(() => {
  void board.placed.value;
  if (fitting.hand || !fitting.hover) return null;
  const o = board.occupantAt(fitting.hover.x, fitting.hover.y);
  if (!o) return null;
  const r = board.layout.value.pieces.get(o.id);
  if (!r) return null;
  const def = PIECE_BY_ID[o.type];
  const sum = (kind: 'link' | 'stamp') =>
    r.terms.filter((t) => t.kind === kind).reduce((n, t) => n + t.value, 0);
  return {
    def,
    r,
    dps: def.role === 'weapon' ? board.params.value.dps[o.type as 'pulse' | 'rail'] : 0,
    linkSum: sum('link'),
    stampSum: sum('stamp'),
  };
});
</script>

<template>
  <section class="fire-control">
    <h2 class="hp-head">Fire control</h2>
    <div class="inspector">
      <template v-if="inspected">
        <div class="title hp-ink" :class="`pc-${inspected.def.id}`">
          {{ inspected.def.name }}
        </div>
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
            <span>{{ fmt(yard.globalMult.value, 2) }}</span>
            <span class="op">=</span>
            <strong>{{ fmt(inspected.r.firepower * yard.globalMult.value) }}</strong>
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
        <p v-else class="worth hp-num">
          Pulling it costs
          <strong>{{ fmt(inspected.r.marginal * yard.globalMult.value) }} dps</strong>
          <template v-if="inspected.def.role === 'booster' && inspected.r.amp > 1">
            · cooled {{ times(inspected.r.amp) }}</template
          >
        </p>
      </template>
      <p v-else class="hint">Hover a mounted module to read its firing solution.</p>
    </div>
  </section>
</template>

<style scoped>
.inspector {
  min-height: 172px;
  padding: 10px 12px;
  background: var(--hull);
  border: 1px solid var(--hull-seam);
  border-radius: var(--radius-plate);
}
.title {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 6px;
}
.expr {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  font-size: 14px;
}
.expr .op {
  color: var(--readout-dim);
}
.expr strong {
  color: var(--plasma);
  font-size: 18px;
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
</style>

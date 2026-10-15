<!--
  SectorPanel — what the current sector brings while its carrier holds, and the sector
  after it, announced ahead so the next fit can be planned. Shown once the breach line
  opens. Each condition rewrites one relation; the board hatches what it silences.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getFleet } from '../../modules';
import { conditionDefs } from '../ship';

const fleet = getFleet();

const now = computed(() => conditionDefs(fleet.conditions.value));
const ahead = computed(() => {
  const c = fleet.nextCarrier.value;
  return c ? { c, conditions: conditionDefs(c.def.conditions) } : null;
});
</script>

<template>
  <section v-if="fleet.carrier.value" class="sector-panel">
    <h2 class="hp-head">Sector {{ fleet.carrier.value.def.sector }}</h2>
    <ul class="conditions">
      <li v-for="c in now" :key="c.id" class="condition">
        <span class="cond-name">{{ c.name }}</span>
        <span class="cond-blurb">{{ c.blurb }}</span>
      </li>
      <li v-if="!now.length" class="condition clear">Clear space. Nothing rewrites the board.</li>
    </ul>
    <div v-if="ahead" class="ahead">
      <div class="ahead-head">
        ahead · sector {{ ahead.c.def.sector }} · <span>{{ ahead.c.def.name }}</span>
      </div>
      <ul class="conditions">
        <li v-for="c in ahead.conditions" :key="c.id" class="condition next">
          <span class="cond-name">{{ c.name }}</span>
          <span class="cond-blurb">{{ c.blurb }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.sector-panel {
  animation: hp-decrypt 600ms ease-out both;
}
.conditions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.condition {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  background: var(--hull);
  border: 1px solid var(--hull-seam);
  border-left: 3px solid var(--breach);
  border-radius: var(--radius-plate);
}
.cond-name {
  font-family: var(--face-stencil);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--breach);
}
.cond-blurb {
  font-size: 12px;
  color: var(--readout);
}
.condition.clear {
  border-left-color: var(--hull-seam);
  font-size: 12px;
  color: var(--readout-dim);
}
.ahead {
  margin-top: 10px;
}
.ahead-head {
  margin-bottom: 5px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--readout-dim);
}
.ahead-head span {
  color: var(--readout);
}
.condition.next {
  background: transparent;
  border-left-color: color-mix(in srgb, var(--breach) 40%, var(--hull-seam));
  border-style: dashed;
  border-left-style: solid;
}
.condition.next .cond-name {
  color: color-mix(in srgb, var(--breach) 70%, var(--readout-dim));
}
.condition.next .cond-blurb {
  color: var(--readout-dim);
}
</style>

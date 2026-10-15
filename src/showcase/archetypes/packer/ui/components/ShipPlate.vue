<!--
  ShipPlate — the ship in service, as stencilled on her hull: name, hull class (base or
  extended, by act), the act, and the honours her line has painted on as kill marks.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getFleet } from '../../modules';
import { roman, times } from '../format';
import { useShipInService } from '../ship';

const fleet = getFleet();
const ship = useShipInService();

/** Kill marks past this many are counted, not painted. */
const PAINTED = 10;
const marks = computed(() => Math.min(PAINTED, fleet.honours.value));
const overflow = computed(() => Math.max(0, fleet.honours.value - PAINTED));
</script>

<template>
  <div class="ship-plate">
    <div class="name">{{ ship.def.value.name }}</div>
    <div class="class">
      <span class="hull-class">{{ ship.hullClass.value }}</span>
      <span class="act-no">Act {{ roman(ship.actNumber.value) }}</span>
    </div>
    <div class="act">{{ ship.actName.value }}</div>
    <div
      class="honours"
      :class="{ none: !fleet.honours.value }"
      :aria-label="`${fleet.honours.value} honours, every weapon ${times(fleet.honourMult.value)}`"
    >
      <span class="marks" aria-hidden="true">
        <span v-for="i in marks" :key="i" class="mark" />
        <span v-if="overflow" class="more hp-num">+{{ overflow }}</span>
      </span>
      <span v-if="fleet.honours.value" class="mult hp-num">{{
        times(fleet.honourMult.value)
      }}</span>
      <span v-else class="mult">no honours yet</span>
    </div>
  </div>
</template>

<style scoped>
.ship-plate {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 18px;
  border-right: 1px solid var(--hull-seam);
  min-width: 0;
}
.name {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--readout);
  line-height: 1.05;
}
.class {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  white-space: nowrap;
}
.hull-class {
  font-family: var(--face-stencil);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--blueprint);
}
.act-no {
  color: var(--readout);
}
.act {
  font-size: 12px;
  color: var(--readout-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.honours {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
}
.marks {
  display: flex;
  gap: 3px;
  align-items: center;
}
/* A kill mark: a carrier's silhouette stencilled in honour white. */
.mark {
  width: 9px;
  height: 11px;
  background: var(--honour);
  clip-path: polygon(50% 0, 100% 35%, 80% 100%, 20% 100%, 0 35%);
}
.more {
  color: var(--honour);
  font-size: 12px;
}
.mult {
  color: var(--honour);
  font-weight: 700;
}
.none .mult {
  color: var(--slag);
  font-weight: 400;
}
</style>

<!--
  Reckoning — tonight's sum, before and during the night. A compass rose carries each side's
  ward, the needle on the forecast quarter and the backing quarter marked beside it. The
  verdict sets the storm against the struck side: its walls and shoring, and on a spray
  night its screens. By day a spray night's share is unknown until dusk, so the verdict
  reads it at the middle share and says so.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { QUARTER_NAME, QUARTERS, SEA } from '../../data';
import { breakerLeak, getWatch } from '../../modules';

const watch = getWatch();
const night = computed(() => watch.phase.value === 'night');
const q = computed(() => watch.quarter.value);
const back = computed(() => watch.backQuarter.value);
const spraying = computed(() => watch.kind.value === 'spray');
const MID_SHARE = SEA.sprayShares[1];
/** The share the verdict reads: tonight's, or the middle one before dusk draws it. */
const share = computed(() => (spraying.value ? (night.value ? watch.spray.value : MID_SHARE) : 0));
const walls = computed(() => watch.wards.value[q.value] + watch.shored.value[q.value]);
const screens = computed(() => watch.screens.value[q.value]);
const through = computed(() =>
  breakerLeak({
    force: watch.storm.value,
    spray: share.value,
    walls: walls.value,
    screens: screens.value,
  }),
);
const backWalls = computed(() =>
  back.value ? watch.wards.value[back.value] + watch.shored.value[back.value] : 0,
);
</script>

<template>
  <section class="reckoning" aria-label="Tonight's reckoning">
    <div class="rose">
      <div
        v-for="k in QUARTERS"
        :key="k"
        class="point"
        :class="[`at-${k}`, { tonight: k === q, backing: k === back }]"
      >
        <span class="letter">{{ k }}</span>
        <span class="num ward">{{ Math.round(watch.wards.value[k]) }}</span>
      </div>
      <div class="needle" :class="`to-${q}`"></div>
    </div>
    <div class="verdict">
      <div class="label">
        {{ watch.relief.value ? 'The final gale' : night ? 'Tonight' : 'Forecast' }} · from the
        {{ QUARTER_NAME[q] }}<template v-if="spraying">, with spray</template>
      </div>
      <div class="line">
        <span class="num storm">{{ watch.storm.value.toFixed(0) }}</span>
        <span class="vs">force against</span>
        <span class="num">{{ walls.toFixed(0) }}</span>
        <span class="vs">ward</span>
        <template v-if="spraying">
          <span class="vs">+</span>
          <span class="num">{{ screens.toFixed(0) }}</span>
          <span class="vs">screens</span>
        </template>
      </div>
      <div v-if="spraying" class="sub num">
        <template v-if="night">{{ Math.round(share * 100) }}% of it is spray</template>
        <template v-else
          >spray {{ SEA.sprayShares[0] * 100 }}–{{ SEA.sprayShares[2] * 100 }}%, drawn at dusk; read
          at {{ MID_SHARE * 100 }}%</template
        >
      </div>
      <div v-if="through <= 0.5" class="holds">The {{ QUARTER_NAME[q] }} side holds.</div>
      <div v-else class="leaks">
        <span class="num">{{ through.toFixed(0) }}</span> will come through to the tower.
      </div>
      <div v-if="back" class="backing-line num">
        May back {{ QUARTER_NAME[back] }}, about one breaker in four: ward
        {{ backWalls.toFixed(0) }} there.
      </div>
      <div class="sub num">
        {{ watch.breakers.value }} breakers<template v-if="night">
          · {{ watch.struck.value }} landed</template
        ><template v-else> at nightfall</template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reckoning {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 14px;
  align-items: center;
}
.rose {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 1px solid var(--sk-rule);
  background: radial-gradient(circle, rgba(184, 149, 90, 0.12), transparent 70%);
}
.point {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  width: 36px;
  margin-left: -18px;
  color: var(--sk-overcast);
}
.point .letter {
  font-family: var(--sk-chart);
  font-size: 11px;
}
.point .ward {
  font-size: 13px;
}
.point.tonight {
  color: var(--sk-rust);
}
.point.tonight .ward {
  font-weight: 600;
}
.point.backing {
  color: var(--sk-brass);
}
.at-N {
  left: 50%;
  top: 6px;
}
.at-S {
  left: 50%;
  bottom: 6px;
}
.at-W {
  left: 2px;
  top: 36px;
  margin-left: 0;
}
.at-E {
  right: 2px;
  top: 36px;
  margin-left: 0;
}
.needle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 20px;
  margin: -20px 0 0 -2px;
  background: linear-gradient(var(--sk-rust), transparent);
  transform-origin: 50% 100%;
  transition: transform 1.2s ease;
}
.needle.to-E {
  transform: rotate(90deg);
}
.needle.to-S {
  transform: rotate(180deg);
}
.needle.to-W {
  transform: rotate(270deg);
}
.label {
  font-family: var(--sk-chart);
  font-size: 12px;
  color: var(--sk-brass);
}
.line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  font-size: 22px;
}
.line .vs {
  font-size: 13px;
  color: var(--sk-overcast);
}
.storm {
  color: var(--sk-foam);
}
.holds {
  color: var(--sk-kelp);
}
.leaks {
  color: var(--sk-rust);
}
.backing-line {
  font-size: 13px;
  color: var(--sk-brass);
}
.sub {
  font-size: 12px;
  color: var(--sk-overcast);
}
</style>

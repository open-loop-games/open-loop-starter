<!--
  Reckoning — tonight's sum, before and during the night: a compass rose with each side's
  ward and the needle on the forecast quarter, then the storm against the struck side's
  ward and what will come through to the tower.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { QUARTER_NAME, QUARTERS } from '../../data';
import { getWatch } from '../../modules';

const watch = getWatch();
const q = computed(() => watch.quarter.value);
const ward = computed(() => watch.wards.value[q.value] + watch.shored.value);
const margin = computed(() => ward.value - watch.storm.value);
</script>

<template>
  <section class="reckoning" aria-label="Tonight's reckoning">
    <div class="rose">
      <div v-for="k in QUARTERS" :key="k" class="point" :class="[`at-${k}`, { tonight: k === q }]">
        <span class="letter">{{ k }}</span>
        <span class="num ward">{{ Math.round(watch.wards.value[k]) }}</span>
      </div>
      <div class="needle" :class="`to-${q}`"></div>
    </div>
    <div class="verdict">
      <div class="label">
        {{ watch.phase.value === 'night' ? 'Tonight' : 'Forecast' }} · gale from the
        {{ QUARTER_NAME[q] }}
      </div>
      <div class="line">
        <span class="num storm">{{ watch.storm.value.toFixed(0) }}</span>
        <span class="vs">force against</span>
        <span class="num">{{ ward.toFixed(0) }}</span>
        <span class="vs">ward</span>
      </div>
      <div v-if="margin >= 0" class="holds">
        The {{ QUARTER_NAME[q] }} wall holds, {{ margin.toFixed(0) }} to spare.
      </div>
      <div v-else class="leaks">
        <span class="num">{{ (-margin).toFixed(0) }}</span> will come through to the tower.
      </div>
      <div class="sub num">
        {{ watch.breakers.value }} breakers<template v-if="watch.phase.value === 'night'">
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
.sub {
  font-size: 12px;
  color: var(--sk-overcast);
}
</style>

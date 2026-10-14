<!--
  HourBand — where the watch stands: the posting and the watch's number, the sun or moon
  crossing the horizon toward dusk or dawn, and the phase's one big verb. By day that is
  lighting the lamp early; by night, shoring up the struck side.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { QUARTER_NAME } from '../../data';
import { getWatch } from '../../modules';
import { mmss, n } from '../format';

const watch = getWatch();
const night = computed(() => watch.phase.value === 'night');
const left = computed(() => Math.max(0, watch.phaseLength.value - watch.clock.value));
const through = computed(() => Math.min(1, watch.clock.value / watch.phaseLength.value));
const canShore = computed(
  () => night.value && toNumber(watch.salvage.value) >= watch.shoreCost.value,
);
</script>

<template>
  <header class="hour-band" :class="{ night }">
    <div class="where">
      <div class="posting">{{ watch.posting.value.name }}</div>
      <div class="watch-no">watch {{ watch.cycle.count.value + 1 }}</div>
    </div>

    <div class="hour">
      <div class="hour-label">
        <span v-if="night">Night {{ watch.night.value }} · the storm is on the rock</span>
        <span v-else>Day {{ watch.night.value }} · calm</span>
        <span class="num left">{{ night ? 'dawn' : 'dusk' }} in {{ mmss(left) }}</span>
      </div>
      <div class="horizon">
        <div class="horizon-run" :style="{ transform: `scaleX(${through})` }"></div>
        <div class="body" :style="{ left: `${through * 100}%` }"></div>
      </div>
    </div>

    <Button
      v-if="!night"
      class="sk-control verb lamp"
      data-testid="light-lamp"
      :repeat="false"
      @click="watch.lightLamp()"
    >
      Light the lamp early
    </Button>
    <Button
      v-else
      class="sk-control verb shore"
      :class="{ afford: canShore }"
      :disabled="!canShore"
      data-testid="shore-up"
      :repeat="false"
      @click="watch.shoreUp()"
    >
      Shore up the {{ QUARTER_NAME[watch.quarter.value] }} wall ·
      <span class="num">{{ n(watch.shoreCost.value) }}</span>
    </Button>
  </header>
</template>

<style scoped>
.hour-band {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 22px;
}
.posting {
  font-family: var(--sk-chart);
  font-size: 16px;
  color: var(--sk-whitewash);
}
.watch-no {
  font-size: 13px;
  color: var(--sk-brass);
}
.hour-label {
  display: flex;
  justify-content: space-between;
  font-family: var(--sk-chart);
  font-size: 13px;
}
.night .hour-label {
  color: #c7d3dc;
}
.left {
  color: var(--sk-overcast);
}
.horizon {
  position: relative;
  height: 6px;
  margin-top: 6px;
  border-radius: 3px;
  background: rgba(223, 230, 226, 0.1);
}
.horizon-run {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(243, 187, 79, 0.15), rgba(243, 187, 79, 0.55));
  transform-origin: left center;
}
.night .horizon-run {
  background: linear-gradient(90deg, rgba(120, 150, 180, 0.15), rgba(160, 190, 215, 0.55));
}
.body {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--sk-lamp);
  box-shadow: 0 0 10px var(--sk-lamp);
}
.night .body {
  background: var(--sk-foam);
  box-shadow: 0 0 10px rgba(223, 230, 226, 0.6);
}
.verb {
  padding: 9px 16px;
  font-family: var(--sk-chart);
  font-size: 13px;
  white-space: nowrap;
}
.verb.lamp {
  border-color: rgba(243, 187, 79, 0.6);
  background: rgba(243, 187, 79, 0.1);
  color: var(--sk-lamp);
}
.verb.shore.afford {
  border-color: rgba(196, 87, 62, 0.8);
  color: #f0b5a6;
  background: var(--sk-rust-soft);
}
</style>

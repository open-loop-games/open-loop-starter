<!--
  WorksTallies — the masthead's live readouts: the compagnons and how many stand idle,
  the share of their ration met, renown, and how long these works have stood. It reads
  module state, so it is its own component in SystemHeader's slot and never a root read.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import { getEmpire, getExposition, getWorks } from '../../modules';
import { formatClock } from '@/composables/useFormatting';

const works = getWorks();
const empire = getEmpire();
const expo = getExposition();

const renown = computed(() => toNumber(empire.renown.value));
</script>

<template>
  <dl class="ae-tallies">
    <div>
      <dt>Compagnons</dt>
      <dd class="ae-figure">
        {{ works.workersTotal.value }}<span class="of"> · {{ works.workersIdle.value }} idle</span>
      </dd>
    </div>
    <div :class="{ warn: works.fed.value < 1 }">
      <dt>Rations</dt>
      <dd class="ae-figure">{{ Math.round(works.fed.value * 100) }}%</dd>
    </div>
    <div>
      <dt>Renown</dt>
      <dd class="ae-figure">{{ renown }}</dd>
    </div>
    <div>
      <dt>These works</dt>
      <dd class="ae-figure">{{ formatClock(expo.cycle.elapsed.value) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.ae-tallies {
  display: flex;
  gap: 22px;
  margin: 0;
}
.ae-tallies div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.ae-tallies dt {
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 10.5px;
  color: var(--ae-drafting-line-faint);
}
.ae-tallies dd {
  margin: 0;
  font-size: 19px;
  color: var(--ae-chalk);
  min-width: 3ch;
  text-align: right;
}
.of {
  font-size: 13px;
  color: var(--ae-drafting-line-faint);
}
.warn dd {
  color: var(--ae-vermilion);
}
</style>

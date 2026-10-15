<!--
  Stocks — salvage, the tower and the logbook, on starter's `ResourceReadout` contract with
  this rock's own renderer: the tower is a whitewashed meter that rusts when it runs low.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import type { ResourceReadout } from '@/ui/compositions';
import { formatGrouped } from '@/composables/useFormatting';
import { ANCHORS } from '../../data';
import { getLogbook, getWatch } from '../../modules';

const watch = getWatch();
const logbook = getLogbook();

const readouts: ResourceReadout[] = [
  {
    id: 'salvage',
    label: 'Salvage',
    value: computed(() => watch.salvage.value),
    rate: computed(
      () => watch.netRate.value * (watch.phase.value === 'night' ? ANCHORS.nightSurge : 1),
    ),
  },
  {
    id: 'tower',
    label: 'Tower',
    value: computed(() => Math.ceil(toNumber(watch.integrity.value))),
    capacity: computed(() => Math.ceil(watch.integrityMax.value)),
    highlight: computed(() =>
      toNumber(watch.integrity.value) < 0.35 * watch.integrityMax.value ? 'deficit' : 'normal',
    ),
  },
  { id: 'logbook', label: 'Logbook', value: computed(() => logbook.entries.value) },
];

const tower = computed(() =>
  watch.integrityMax.value > 0 ? toNumber(watch.integrity.value) / watch.integrityMax.value : 0,
);
</script>

<template>
  <div class="stocks">
    <div
      v-for="r in readouts"
      :key="r.id"
      class="stock"
      :class="[`stock--${r.id}`, { low: r.highlight?.value === 'deficit' }]"
    >
      <div class="label">{{ r.label }}</div>
      <div class="value num">
        {{ formatGrouped(r.value.value)
        }}<span v-if="r.capacity" class="of">/{{ formatGrouped(r.capacity.value) }}</span>
      </div>
      <div v-if="r.id === 'salvage'" class="sub num">
        nets catch {{ toNumber(r.rate!.value).toFixed(2) }}/s each
      </div>
      <div v-else-if="r.id === 'logbook'" class="sub">entries, for between watches</div>
      <div v-if="r.id === 'tower'" class="meter">
        <div class="fill" :style="{ transform: `scaleY(${tower})` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stocks {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.stock {
  position: relative;
  padding: 6px 8px;
  border-left: 2px solid var(--sk-rule);
}
.label {
  font-family: var(--sk-chart);
  font-size: 11px;
  color: var(--sk-brass);
}
.value {
  font-size: 24px;
  line-height: 1.1;
  color: var(--sk-whitewash);
}
.of {
  font-size: 14px;
  color: var(--sk-overcast);
}
.sub {
  font-size: 11.5px;
  color: var(--sk-overcast);
}
.stock--tower {
  padding-right: 24px;
}
.meter {
  position: absolute;
  right: 4px;
  top: 6px;
  bottom: 6px;
  width: 12px;
  background: rgba(10, 14, 16, 0.7);
  clip-path: polygon(25% 0, 75% 0, 100% 100%, 0 100%);
}
.fill {
  position: absolute;
  inset: 0;
  background: var(--sk-whitewash);
  transform-origin: bottom center;
  transition: transform 0.4s ease;
}
.low .fill {
  background: var(--sk-rust);
}
.low .value {
  color: #f0b5a6;
}
</style>

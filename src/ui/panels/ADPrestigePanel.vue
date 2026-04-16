<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';

const ad = useModule(AntimatterDimensionsKey);

const ip = computed(() => format(Decimal.floor(ad.infinityPoints.value)));
const gain = computed(() => format(ad.conversion.actualGain.value));
const nextAt = computed(() => format(ad.conversion.nextAt.value));
const canConvert = computed(() => ad.conversion.canConvert.value);
const lifetimeInfinities = computed(() => format(Decimal.floor(ad.lifetimeInfinities.value)));

function convert() {
  if (canConvert.value) ad.conversion.convert();
}
</script>

<template>
  <section class="ad-prestige-panel">
    <h3>Infinity</h3>
    <div class="prestige-info">
      <div class="row">
        <span class="label">Infinity Points</span>
        <span class="value">{{ ip }}</span>
      </div>
      <div class="row">
        <span class="label">Infinities reached</span>
        <span class="value">{{ lifetimeInfinities }}</span>
      </div>
      <div class="row">
        <span class="label">Gain on convert</span>
        <span class="value">+{{ gain }}</span>
      </div>
      <div class="row">
        <span class="label">Next at (max antimatter)</span>
        <span class="value">{{ nextAt }}</span>
      </div>
      <button
        class="btn-primary"
        :disabled="!canConvert"
        @click="convert"
      >
        Infinity (resets antimatter and dimensions)
      </button>
      <p class="hint">
        Convert resets the current run. Infinity Points, IP upgrades, and
        lifetime counters persist.
      </p>
    </div>
  </section>
</template>

<style scoped>
.ad-prestige-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.prestige-info {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.row {
  display: flex;
  justify-content: space-between;
}
.label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.value {
  font-weight: 600;
}
.hint {
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';

const ad = useModule(AntimatterDimensionsKey);

const ep = computed(() => format(Decimal.floor(ad.eternityPoints.value)));
const gain = computed(() => format(ad.eternityConversion.actualGain.value));
const nextAt = computed(() => format(ad.eternityConversion.nextAt.value));
const canConvert = computed(() => ad.eternityConversion.canConvert.value);
const lifetimeEternities = computed(() => format(Decimal.floor(ad.lifetimeEternities.value)));

function convert() {
  if (canConvert.value) ad.eternityConversion.convert();
}
</script>

<template>
  <section class="ad-eternity-panel">
    <h3>Eternity</h3>
    <div class="eternity-info">
      <div class="row">
        <span class="label">Eternity Points</span>
        <span class="value">{{ ep }}</span>
      </div>
      <div class="row">
        <span class="label">Eternities reached</span>
        <span class="value">{{ lifetimeEternities }}</span>
      </div>
      <div class="row">
        <span class="label">Gain on convert</span>
        <span class="value">+{{ gain }}</span>
      </div>
      <div class="row">
        <span class="label">Next at (max IP)</span>
        <span class="value">{{ nextAt }}</span>
      </div>
      <button
        class="btn-primary"
        :disabled="!canConvert"
        @click="convert"
      >
        Eternity (resets Infinity and Antimatter tiers)
      </button>
      <p class="hint">
        Convert cascades through Infinity — antimatter, dimensions, IP, and IP
        upgrades all reset. Eternity Points, EP upgrades, challenge
        completions, and lifetime counters persist.
      </p>
    </div>
  </section>
</template>

<style scoped>
.ad-eternity-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.eternity-info {
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

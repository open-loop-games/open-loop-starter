<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { prestigeState } from '@/modules/mods/prestige';

const state = prestigeState!;

const renown = computed(() => format(Decimal.floor(state.renown.value)));
const gain = computed(() => format(state.conversion.currentGain.value));
const nextAt = computed(() => format(state.conversion.nextAt.value));
const canConvert = computed(() => state.conversion.canConvert.value);

function convert() {
  if (canConvert.value) state.resetRun();
}
</script>

<template>
  <section class="prestige-panel">
    <h3>Prestige</h3>
    <div class="prestige-info">
      <div class="row">
        <span class="label">Renown</span>
        <span class="value">{{ renown }}</span>
      </div>
      <div class="row">
        <span class="label">Gain on convert</span>
        <span class="value">+{{ gain }}</span>
      </div>
      <div class="row">
        <span class="label">Next at</span>
        <span class="value">{{ nextAt }} gold</span>
      </div>
      <button class="btn-primary" :disabled="!canConvert" @click="convert">
        Convert (resets run)
      </button>
      <p class="hint">Each Renown adds +10% to every producer, permanently.</p>
    </div>
  </section>
</template>

<style scoped>
.prestige-panel h3 {
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

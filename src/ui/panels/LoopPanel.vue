<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from 'open-loop-engine';
import { loopState } from '@/modules/mods/loop';

const state = loopState!;
const mana = computed(() => Decimal.floor(state.mana.value).toString());
const maxMana = computed(() => state.maxMana.toString());
const manaPercent = computed(() =>
  Decimal.div(state.mana.value, state.maxMana).mul(100).toNumber(),
);
const loopCount = computed(() => state.loop.count.value);
const elapsed = computed(() => Math.floor(state.loop.elapsed.value));

function endLoop() {
  state.loop.end();
}
</script>

<template>
  <section class="loop-panel">
    <div class="mana-block">
      <span class="label">Mana</span>
      <div class="mana-bar">
        <div class="mana-fill" :style="{ width: manaPercent + '%' }" />
        <span class="mana-text">{{ mana }} / {{ maxMana }}</span>
      </div>
    </div>
    <div class="loop-info">
      <span>Loop #{{ loopCount }}</span>
      <span>{{ elapsed }}s</span>
      <button class="btn-sm" @click="endLoop">End Loop</button>
    </div>
  </section>
</template>

<style scoped>
.loop-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.mana-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label {
  font-size: 0.75em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.mana-bar {
  position: relative;
  height: 24px;
  background: var(--color-bg);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.mana-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.1s linear;
}
.mana-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 600;
}
.loop-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
/**
 * Fixed-position FPS/TPS readout for dev builds. Pure presentation plus a
 * single `requestAnimationFrame` loop — no reactivity on engine state, no
 * interaction. Ported from `incloneution/src/dev/DevDiagnostics.vue` with
 * the state-dump panel stripped; starter forks can re-add that locally
 * when they need it.
 *
 * FPS is rAF-derived frame count. TPS reads `engine.loop.deltaMean` once
 * per 1s sample tick — sufficient for spot-checking repaint budget on
 * engine-driven views like `DomGrid.vue` at 60×60.
 *
 * Speed buttons set `engine.loop.speedMultiplier` directly. Reset to 1x
 * on unmount so a fork doesn't ship a cranked-up demo if the dev panel
 * gets unmounted with speed left high.
 */

import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import type { Engine } from 'open-loop-engine';

const engine = inject<Engine>('engine');

const fps = ref(0);
const tps = ref(0);

let frameCount = 0;
let lastSampleTime = performance.now();
let rafId = 0;

function measure() {
  frameCount++;
  const now = performance.now();
  if (now - lastSampleTime >= 1000) {
    fps.value = frameCount;
    frameCount = 0;
    lastSampleTime = now;
    const dm = engine?.loop.deltaMean ?? 0;
    tps.value = dm > 0 ? Math.round(1 / dm) : 0;
  }
  rafId = requestAnimationFrame(measure);
}

const SPEEDS = [1, 5, 10, 20] as const;
const speed = ref(engine?.loop.speedMultiplier ?? 1);

function setSpeed(mult: number): void {
  if (!engine) return;
  engine.loop.speedMultiplier = mult;
  speed.value = mult;
}

const speedClasses = computed(() => (s: number) => ({
  active: speed.value === s,
}));

onMounted(() => {
  rafId = requestAnimationFrame(measure);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  if (engine) engine.loop.speedMultiplier = 1;
});
</script>

<template>
  <div class="dev-diag">
    <div class="dev-diag-row">
      <span class="dev-diag-label">FPS</span>
      <span class="dev-diag-value">{{ fps }}</span>
      <span class="dev-diag-sep">|</span>
      <span class="dev-diag-label">TPS</span>
      <span class="dev-diag-value">{{ tps }}</span>
    </div>
    <div class="dev-diag-row dev-diag-row--speed">
      <span class="dev-diag-label">Speed</span>
      <button
        v-for="s in SPEEDS"
        :key="s"
        type="button"
        class="dev-diag-speed"
        :class="speedClasses(s)"
        :data-testid="`dev-speed-${s}x`"
        @click="setSpeed(s)"
      >
        {{ s }}x
      </button>
    </div>
  </div>
</template>

<style scoped>
.dev-diag {
  position: fixed;
  bottom: 8px;
  right: 8px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  background: rgba(10, 10, 20, 0.88);
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #8899aa;
  user-select: none;
}
.dev-diag-row {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.dev-diag-row--speed {
  pointer-events: auto;
}
.dev-diag-label {
  color: #667788;
}
.dev-diag-value {
  color: #aaccee;
  min-width: 28px;
  text-align: right;
}
.dev-diag-sep {
  color: #334455;
}
.dev-diag-speed {
  flex: 1 1 0;
  background: transparent;
  border: 1px solid #2a2a3a;
  border-radius: 4px;
  color: #8899aa;
  padding: 2px 6px;
  font: inherit;
  cursor: pointer;
  transition:
    background 0.1s linear,
    border-color 0.1s linear,
    color 0.1s linear;
}
.dev-diag-speed:hover {
  border-color: #4a5a7a;
  color: #aaccee;
}
.dev-diag-speed.active {
  background: #2a3a5a;
  border-color: #4a6a9a;
  color: #cce4ff;
}
</style>

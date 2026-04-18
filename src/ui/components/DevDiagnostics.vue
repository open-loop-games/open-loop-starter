<script setup lang="ts">
/**
 * Fixed-position FPS/TPS readout for dev builds. Pure presentation plus a
 * single `requestAnimationFrame` loop — no reactivity on engine state, no
 * interaction. Ported from `incloneution/src/dev/DevDiagnostics.vue` with
 * the speed controls and state-dump panel stripped; starter forks can
 * re-add those locally when they need them.
 *
 * FPS is rAF-derived frame count. TPS reads `engine.loop.deltaMean` once
 * per 1s sample tick — sufficient for spot-checking repaint budget on
 * engine-driven views like `DomGrid.vue` at 60×60.
 */

import { inject, onMounted, onUnmounted, ref } from 'vue';
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

onMounted(() => {
  rafId = requestAnimationFrame(measure);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
});
</script>

<template>
  <div class="dev-diag">
    <span class="dev-diag-label">FPS</span>
    <span class="dev-diag-value">{{ fps }}</span>
    <span class="dev-diag-sep">|</span>
    <span class="dev-diag-label">TPS</span>
    <span class="dev-diag-value">{{ tps }}</span>
  </div>
</template>

<style scoped>
.dev-diag {
  position: fixed;
  bottom: 8px;
  right: 8px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 20, 0.88);
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #8899aa;
  pointer-events: none;
  user-select: none;
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
</style>

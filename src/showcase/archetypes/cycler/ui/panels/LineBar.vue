<!--
  LineBar — the defended line's integrity, the run's life bar. Reads `useCommandState`
  (integrity [0,1] + state ok/warn/crit/breach from the wall module). Leak-through
  bleeds it during INBOUND; MW surplus repairs it in STANDBY; at 0 it breaches and the
  run ends. The `--pct` fill is a bottom-of-stack CSS var, so per-tick updates never
  reflow.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useCommandState } from '../../composables/useCommandState';

const cmd = useCommandState();
const pct = computed(() => Math.round(cmd.lineIntegrity.value * 100));
</script>

<template>
  <div
    class="cyc-line"
    :data-state="cmd.lineState.value"
    :style="{ '--pct': pct + '%' }"
    role="meter"
    :aria-valuenow="pct"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Defended line integrity"
  >
    <div class="cyc-line__fill" />
    <div class="cyc-line__ticks" aria-hidden="true">
      <span>▔</span><span>▔</span><span>▔</span><span>▔</span><span>▔</span><span>▔</span>
    </div>
    <span class="cyc-line__label"
      >LINE <b>{{ pct }}%</b></span
    >
  </div>
</template>

<style scoped>
.cyc-line {
  position: relative;
  height: 16px;
  background: var(--cyc-bg2);
  border-top: 1px solid var(--cyc-grn);
  border-bottom: 1px solid var(--cyc-grn2);
  overflow: hidden;
  display: flex;
  align-items: center;
  margin-top: 20px;
}
.cyc-line__fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--cyc-grn2) 0 var(--pct), var(--cyc-reddim) var(--pct));
  opacity: 0.6;
  transition: background 0.35s linear;
}
.cyc-line[data-state='warn'] .cyc-line__fill {
  background: linear-gradient(90deg, var(--cyc-amb) 0 var(--pct), var(--cyc-reddim) var(--pct));
}
.cyc-line[data-state='crit'] .cyc-line__fill {
  background: linear-gradient(90deg, var(--cyc-red) 0 var(--pct), #2a0a10 var(--pct));
}
.cyc-line[data-state='breach'] .cyc-line__fill {
  background: var(--cyc-reddim);
  animation: cyc-flat 1s step-end infinite;
}
.cyc-line__ticks {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  justify-content: space-around;
  font-size: 9px;
  color: var(--cyc-grn);
  letter-spacing: -1px;
}
.cyc-line__label {
  position: absolute;
  right: 6px;
  top: -18px;
  font-size: 10px;
  color: var(--cyc-grn);
  z-index: 2;
}
.cyc-line__label b {
  color: var(--cyc-grn);
  font-variant-numeric: tabular-nums;
}
.cyc-line[data-state='warn'] .cyc-line__label b {
  color: var(--cyc-amb);
}
.cyc-line[data-state='crit'] .cyc-line__label b,
.cyc-line[data-state='breach'] .cyc-line__label b {
  color: var(--cyc-red);
}
@keyframes cyc-flat {
  50% {
    opacity: 0.25;
  }
}
</style>

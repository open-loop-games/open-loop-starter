<script setup lang="ts">
import { computed } from 'vue';
import type { Trajectory, TrajectoryBand } from '@/composables/useBalanceWorkbench';

const props = defineProps<{ trajectory: Trajectory }>();

// Fixed drawing space; the SVG stretches to its container via preserveAspectRatio.
const W = 600;
const H = 180;
const PAD = { top: 8, right: 8, bottom: 8, left: 8 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const tickCount = computed(() =>
  Math.max(props.trajectory.baseline.length, props.trajectory.variant.length),
);

const maxValue = computed(() => {
  let m = 0;
  for (const b of props.trajectory.baseline) if (b.max > m) m = b.max;
  for (const b of props.trajectory.variant) if (b.max > m) m = b.max;
  return m > 0 ? m : 1;
});

function x(tick: number): number {
  const n = tickCount.value;
  if (n <= 1) return PAD.left + plotW / 2;
  return PAD.left + (tick / (n - 1)) * plotW;
}

function y(value: number): number {
  return PAD.top + plotH - (Math.max(0, value) / maxValue.value) * plotH;
}

/** Filled polygon spanning the min→max band across ticks. */
function bandPath(bands: TrajectoryBand[]): string {
  if (bands.length === 0) return '';
  const top = bands.map((b) => `${x(b.tick).toFixed(1)},${y(b.max).toFixed(1)}`);
  const bottom = bands
    .slice()
    .reverse()
    .map((b) => `${x(b.tick).toFixed(1)},${y(b.min).toFixed(1)}`);
  return `M ${top.join(' L ')} L ${bottom.join(' L ')} Z`;
}

/** Mean polyline across ticks. */
function meanPath(bands: TrajectoryBand[]): string {
  if (bands.length === 0) return '';
  return bands
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(b.tick).toFixed(1)} ${y(b.mean).toFixed(1)}`)
    .join(' ');
}

const baselineBand = computed(() => bandPath(props.trajectory.baseline));
const baselineMean = computed(() => meanPath(props.trajectory.baseline));
const variantBand = computed(() => bandPath(props.trajectory.variant));
const variantMean = computed(() => meanPath(props.trajectory.variant));

function formatMax(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e6 || (abs < 0.001 && abs > 0)) return n.toExponential(1);
  return abs < 1 ? n.toFixed(3) : n.toFixed(1);
}
</script>

<template>
  <figure class="traj">
    <figcaption class="traj__caption">
      <span class="traj__name">{{ trajectory.name }}</span>
      <span class="traj__legend">
        <span class="traj__key traj__key--baseline">baseline</span>
        <span class="traj__key traj__key--variant">variant</span>
      </span>
    </figcaption>
    <svg
      class="traj__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="`Trajectory for ${trajectory.name}`"
    >
      <path
        v-if="baselineBand"
        :d="baselineBand"
        class="traj__band traj__band--baseline"
      />
      <path
        v-if="variantBand"
        :d="variantBand"
        class="traj__band traj__band--variant"
      />
      <path
        v-if="baselineMean"
        :d="baselineMean"
        class="traj__line traj__line--baseline"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-if="variantMean"
        :d="variantMean"
        class="traj__line traj__line--variant"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div class="traj__axis">
      <span>{{ formatMax(maxValue) }}</span>
      <span>0</span>
    </div>
  </figure>
</template>

<style scoped>
.traj {
  margin: 0 0 var(--gap);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.traj__caption {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
}

.traj__name {
  font-family: var(--font-mono);
  color: var(--color-text);
}

.traj__legend {
  display: flex;
  gap: 10px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.traj__key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
}

.traj__key::before {
  content: '';
  width: 10px;
  height: 2px;
  border-radius: 1px;
}

.traj__key--baseline::before {
  background: var(--color-text-muted);
}

.traj__key--variant::before {
  background: var(--color-primary);
}

.traj__svg {
  width: 100%;
  height: 160px;
  display: block;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.traj__band {
  stroke: none;
}

.traj__band--baseline {
  fill: var(--color-text-muted);
  opacity: 0.12;
}

.traj__band--variant {
  fill: var(--color-primary);
  opacity: 0.14;
}

.traj__line {
  fill: none;
  stroke-width: 1.5;
}

.traj__line--baseline {
  stroke: var(--color-text-muted);
}

.traj__line--variant {
  stroke: var(--color-primary);
}

.traj__axis {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  margin-top: -2px;
}
</style>

<!--
  ProgressBar — plain or segmented horizontal progress bar.

  Class hooks: olui-progress-bar, olui-progress-bar__track,
  olui-progress-bar__fill, olui-progress-bar__label (when `label` set).
  Root carries data-state="empty" | "partial" | "full".
  Custom props: --progress-bar-{fill,track,radius,transition}.

  Segmented mode: passing `segments` overrides `value`/`max`. Each
  segment is a fill sized `width: value * 100%`, rendered left-to-right
  in the shared track. Consumers keep the sum ≤ 1 and colour segments
  via the optional per-segment `class`.
-->
<script setup lang="ts">
import { computed } from 'vue';

export interface ProgressBarSegment {
  /** Fraction of the track this segment fills, 0..1. */
  value: number;
  /** Optional class applied to the segment's fill element. */
  class?: string;
}

const props = withDefaults(
  defineProps<{
    value?: number;
    max?: number;
    segments?: ProgressBarSegment[];
    label?: string;
  }>(),
  { value: 0, max: 1 },
);

const isSegmented = computed(() => Array.isArray(props.segments));

const ratio = computed(() => {
  if (props.max <= 0) return 0;
  return Math.max(0, Math.min(1, props.value / props.max));
});

const state = computed<'empty' | 'partial' | 'full'>(() => {
  if (isSegmented.value) {
    const segs = props.segments!;
    if (segs.length === 0 || segs.every((s) => s.value <= 0)) return 'empty';
    if (segs.every((s) => s.value >= 1)) return 'full';
    return 'partial';
  }
  if (ratio.value <= 0) return 'empty';
  if (ratio.value >= 1) return 'full';
  return 'partial';
});

const pct = (v: number) => Math.max(0, Math.min(1, v)) * 100 + '%';
</script>

<template>
  <div
    class="olui-progress-bar"
    :data-state="state"
  >
    <div class="olui-progress-bar__track">
      <template v-if="isSegmented">
        <div
          v-for="(seg, i) in segments"
          :key="i"
          class="olui-progress-bar__fill"
          :class="seg.class"
          :style="{ width: pct(seg.value) }"
        />
      </template>
      <div
        v-else
        class="olui-progress-bar__fill"
        :style="{ width: pct(ratio) }"
      />
    </div>
    <span
      v-if="label"
      class="olui-progress-bar__label"
    >{{ label }}</span>
  </div>
</template>

<style>
.olui-progress-bar {
  --progress-bar-fill: var(--color-primary);
  --progress-bar-track: var(--color-surface);
  --progress-bar-radius: var(--radius-sm);
  --progress-bar-transition: width 0.1s linear;

  position: relative;
  width: 100%;
  display: block;
}

.olui-progress-bar__track {
  display: flex;
  width: 100%;
  min-height: 10px;
  background: var(--progress-bar-track);
  border-radius: var(--progress-bar-radius);
  overflow: hidden;
}

.olui-progress-bar__fill {
  flex: 0 0 auto;
  background: var(--progress-bar-fill);
  transition: var(--progress-bar-transition);
}

.olui-progress-bar__label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  line-height: 1;
  color: var(--color-text);
  pointer-events: none;
}
</style>

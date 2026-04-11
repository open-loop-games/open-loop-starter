<!--
  ProgressBar — plain or segmented horizontal progress bar.

  Lifted from idle-loops-ng's SegmentedProgressBar.vue (0.1s linear fill
  transition, CSS-var driven). Covers Progress Knight's labeled progress
  bars and Kittens Game's `X/Y owned` label overlay pattern.

  Widget API conventions (Phase 2, locked by OL-274 — copy this block
  verbatim into every subsequent widget's file header):

    1. Class hooks (structure) — BEM `olui-{widget}__{element}`. Ship the
       minimum. A hook earns its place only if consumers would select it
       from a stylesheet, OR tests need it for structural assertions.
       Expect 3–6 per widget, never 15. Every shipped class is part of
       the semver contract — breaking one is a major bump.

    2. Data-state attributes (reactive state) — `data-state="X"` on
       elements whose state mutates. Mirrors reka-ui's `data-state='open'`
       convention. Consumers target `[data-state='X']` in CSS. Prefer
       data-attrs over modifier classes so templates set a single
       attribute binding rather than managing class strings.

    3. Custom properties (per-instance knobs) — `--olui-{widget}-*`
       scoped to component root, 3–5 per widget max. Defaults fall back
       to Phase 1 tokens so redeclaring a token re-themes the widget
       without touching selectors. Consumers override per-instance by
       redeclaring the `--olui-{widget}-*` variable on any ancestor.

    4. No behavior props, no game logic. The widget owns visual-only
       behaviors (fill transitions, state animations, focus via reka-ui).
       Consumers own semantics — what the value means, when it hits
       zero, what "depleted" means. Props are presentational.

  ProgressBar specifics:

    Class hooks:
      - olui-progress-bar          — root, positioning context for label
      - olui-progress-bar__track   — the empty track
      - olui-progress-bar__fill    — the fill element (one in plain mode,
                                     one per segment in segmented mode)
      - olui-progress-bar__label   — centered overlay, only when `label` set

    Data-state on root: "empty" | "partial" | "full".

    Custom properties:
      - --olui-progress-bar-fill        (default var(--color-primary))
      - --olui-progress-bar-track       (default var(--color-surface))
      - --olui-progress-bar-radius      (default var(--radius-sm))
      - --olui-progress-bar-transition  (default width 0.1s linear)

    Segmented mode: `segments` overrides `value`/`max`. Each segment is
    rendered as its own fill with literal `width: value * 100%`. Segments
    render left-to-right in the shared track. Consumers keep the sum
    ≤ 1 and per-segment coloring is done via the optional `class` prop.
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
  --olui-progress-bar-fill: var(--color-primary);
  --olui-progress-bar-track: var(--color-surface);
  --olui-progress-bar-radius: var(--radius-sm);
  --olui-progress-bar-transition: width 0.1s linear;

  position: relative;
  width: 100%;
  display: block;
}

.olui-progress-bar__track {
  display: flex;
  width: 100%;
  min-height: 10px;
  background: var(--olui-progress-bar-track);
  border-radius: var(--olui-progress-bar-radius);
  overflow: hidden;
}

.olui-progress-bar__fill {
  flex: 0 0 auto;
  background: var(--olui-progress-bar-fill);
  transition: var(--olui-progress-bar-transition);
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

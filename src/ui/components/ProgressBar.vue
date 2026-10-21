<!--
  ProgressBar — plain or segmented horizontal progress bar.

  Costume classes: olui-progress-bar, olui-progress-bar__track,
  olui-progress-bar__fill, olui-progress-bar__mark (one per mark),
  olui-progress-bar__label (when `label` set).
  Root carries data-state="empty" | "partial" | "full" and data-from="left" | "right".
  Custom props: --progress-bar-{fill,fill-full,track,track-empty,border,shadow,
  radius,height,mark,transition}. A theme styles the track and the full and empty
  states through these alone, so a story restyles a bar, a hairline gauge
  included, without reaching into its elements. The border is inside the
  height: a 2px gauge sets `--progress-bar-border: none`.

  The fill is scaled, never resized: each fill carries `--progress-bar-ratio`
  (and `--progress-bar-offset` for a segment), and the stylesheet turns them into
  `transform: scaleX(…)` on a full-width element, so a bar that moves every tick
  costs no layout. A transition on it is a `transform` transition. A scaled
  pattern distorts, so a patterned fill or segment clips instead:
    transform: none;
    clip-path: inset(0 calc((1 - var(--progress-bar-offset, 0) - var(--progress-bar-ratio)) * 100%)
      0 calc(var(--progress-bar-offset, 0) * 100%));
  with a `clip-path` transition. A bar filling from the right swaps the two insets.

  Segmented mode: passing `segments` overrides `value`/`max`. Each segment is
  scaled to its fraction and shifted past the ones before it in the shared
  track. Consumers keep the sum ≤ 1 and colour segments via the optional
  per-segment `class`.

  `from="right"` anchors the fill at the right edge, for a gauge that drains
  toward its end or belongs to the right-hand side. Segments then stack leftward.

  `marks` draws thin ticks at positions in the units of `value` and `max`, so a
  mark sits where the fill's edge would be: a threshold, a checkpoint, a
  landmark. A mark given as `{ at, class, title }` carries its own costume
  class and a hover title.
-->
<script setup lang="ts">
import { computed } from 'vue';

export interface ProgressBarMark {
  /** Position, in the units of `value` and `max`. */
  at: number;
  /** Optional class applied to the mark element. */
  class?: string;
  /** Shown on hover. */
  title?: string;
}

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
    marks?: readonly (number | ProgressBarMark)[];
    label?: string;
    /** The edge the fill grows from. */
    from?: 'left' | 'right';
  }>(),
  { value: 0, max: 1, segments: undefined, marks: undefined, label: undefined, from: 'left' },
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

const clamp = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : v > 0 ? 1 : 0);

/** Each segment's fraction, and the fractions before it. */
const segmentStyles = computed(() => {
  let offset = 0;
  return (props.segments ?? []).map((seg) => {
    const r = clamp(seg.value);
    const style = { '--progress-bar-ratio': r, '--progress-bar-offset': offset };
    offset += r;
    return style;
  });
});

const markViews = computed(() =>
  (props.marks ?? []).map((m) => {
    const mark = typeof m === 'number' ? { at: m } : m;
    const r = clamp(props.max > 0 ? mark.at / props.max : 0);
    return { ...mark, left: `${(props.from === 'right' ? 1 - r : r) * 100}%` };
  }),
);
</script>

<template>
  <div class="olui-progress-bar" :data-state="state" :data-from="from">
    <div class="olui-progress-bar__track">
      <template v-if="isSegmented">
        <div
          v-for="(seg, i) in segments"
          :key="i"
          class="olui-progress-bar__fill"
          :class="seg.class"
          :style="segmentStyles[i]"
        />
      </template>
      <div v-else class="olui-progress-bar__fill" :style="{ '--progress-bar-ratio': ratio }" />
    </div>
    <span
      v-for="(mark, i) in markViews"
      :key="i"
      class="olui-progress-bar__mark"
      :class="mark.class"
      :style="{ left: mark.left }"
      :title="mark.title"
    />
    <span v-if="label" class="olui-progress-bar__label">{{ label }}</span>
  </div>
</template>

<style>
.olui-progress-bar {
  /* Read each token, never set it, so a value set on any ancestor reaches the widget. */
  --_progress-bar-fill: var(--progress-bar-fill, var(--color-primary));
  --_progress-bar-fill-full: var(--progress-bar-fill-full, var(--color-success));
  --_progress-bar-track: var(
    --progress-bar-track,
    color-mix(in srgb, var(--color-bg) 70%, #000 30%)
  );
  --_progress-bar-track-empty: var(
    --progress-bar-track-empty,
    color-mix(in srgb, var(--_progress-bar-track) 70%, transparent)
  );
  --_progress-bar-border: var(--progress-bar-border, 1px solid var(--color-border));
  --_progress-bar-shadow: var(--progress-bar-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.3));
  --_progress-bar-radius: var(--progress-bar-radius, var(--radius-sm));
  --_progress-bar-height: var(--progress-bar-height, 12px);
  --_progress-bar-mark: var(--progress-bar-mark, var(--color-text-muted));
  --_progress-bar-transition: var(--progress-bar-transition, transform 0.1s linear);

  position: relative;
  width: 100%;
  display: block;
}

.olui-progress-bar__track {
  position: relative;
  width: 100%;
  min-height: var(--_progress-bar-height);
  background: var(--_progress-bar-track);
  border: var(--_progress-bar-border);
  border-radius: var(--_progress-bar-radius);
  box-shadow: var(--_progress-bar-shadow);
  overflow: hidden;
}

.olui-progress-bar[data-state='empty'] .olui-progress-bar__track {
  background: var(--_progress-bar-track-empty);
}

.olui-progress-bar__fill {
  position: absolute;
  inset: 0;
  background: var(--_progress-bar-fill);
  transform-origin: left;
  transform: translateX(calc(var(--progress-bar-offset, 0) * 100%))
    scaleX(var(--progress-bar-ratio, 0));
  transition: var(--_progress-bar-transition);
}

.olui-progress-bar[data-from='right'] .olui-progress-bar__fill {
  transform-origin: right;
  transform: translateX(calc(var(--progress-bar-offset, 0) * -100%))
    scaleX(var(--progress-bar-ratio, 0));
}

.olui-progress-bar[data-state='full'] .olui-progress-bar__fill {
  background: var(--_progress-bar-fill-full);
}

.olui-progress-bar__mark {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  margin-left: -1px;
  background: var(--_progress-bar-mark);
  pointer-events: none;
}

.olui-progress-bar__mark[title] {
  pointer-events: auto;
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

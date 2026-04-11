<!--
  Tooltip — hover popover with delay + smart positioning.

  Thin wrapper around reka-ui's Tooltip primitives. reka-ui owns all the
  behavior (delay, portal, positioning, a11y, keyboard dismiss). This
  wrapper adds the class hook on the content element, custom-property
  defaults, and a corpus-matched 400ms default delay. Lifted reference:
  incloneution's v-tooltip directive (hand-rolled 400ms delay, top→bottom
  fallback positioning, HTML content) — same UX, now backed by a tested
  primitive instead of manual getBoundingClientRect math.

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

  Addendum for reka-ui wrappers (OL-275, applies to Tooltip, Popover,
  Toast, Select):

    5. Don't invent a data-state. reka-ui already sets `data-state`,
       `data-side`, and `data-align` on the content element. Consumers
       target those directly — our wrapper only adds class hooks and
       custom-property defaults, never duplicates reka-ui's attrs.

    6. Trigger is a slot with `as-child`. The consumer's element becomes
       the trigger without a wrapping div, so their click targets and
       focus outlines stay intact.

  Tooltip specifics:

    Class hooks:
      - olui-tooltip__content — the tooltip body element rendered into
        reka-ui's portal. The trigger has no class hook (it's the
        consumer's element).

    Data attributes (from reka-ui, not us):
      - data-state: "closed" | "delayed-open" | "instant-open"
      - data-side:  "top" | "right" | "bottom" | "left"
      - data-align: "start" | "center" | "end"

    Custom properties:
      - --olui-tooltip-bg         (default var(--color-text))
      - --olui-tooltip-text       (default var(--color-bg))
      - --olui-tooltip-padding    (default 6px 10px)
      - --olui-tooltip-radius     (default var(--radius-sm))
      - --olui-tooltip-max-width  (default 260px)

    Default delay is 400ms to match the incloneution lift target. A
    TooltipProvider is mounted inside this component so it works
    standalone; AppFrame can also mount one with `tooltipDelay` to set
    an app-wide default. Inner providers override outer ones, and
    per-instance `delay` prop overrides both.
-->
<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui';

withDefaults(
  defineProps<{
    delay?: number;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    disabled?: boolean;
  }>(),
  { delay: 400, side: 'top', sideOffset: 4, disabled: false },
);
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot :disabled="disabled">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="olui-tooltip__content"
          :side="side"
          :side-offset="sideOffset"
        >
          <slot name="content" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style>
.olui-tooltip__content {
  --olui-tooltip-bg: var(--color-text);
  --olui-tooltip-text: var(--color-bg);
  --olui-tooltip-padding: 6px 10px;
  --olui-tooltip-radius: var(--radius-sm);
  --olui-tooltip-max-width: 260px;

  background: var(--olui-tooltip-bg);
  color: var(--olui-tooltip-text);
  padding: var(--olui-tooltip-padding);
  border-radius: var(--olui-tooltip-radius);
  max-width: var(--olui-tooltip-max-width);
  font-size: 0.85em;
  line-height: 1.4;
  z-index: calc(var(--olui-modal-z-base, 1000) + 10);
  pointer-events: none;
  user-select: none;
}
</style>

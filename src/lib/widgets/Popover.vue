<!--
  Popover — click-activated non-modal panel.

  Thin wrapper around reka-ui's Popover primitives. Foundational for
  Phase 2 widgets that need click-to-pin hover details (ActionCard
  breakdown, ResourceBar tooltips that need interaction). No lift
  target in the consumers — this is the non-modal sibling of Tooltip
  that future widgets will compose with.

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

    5. (reka-ui wrapper addendum) Don't invent a data-state. reka-ui
       already sets `data-state`, `data-side`, `data-align` on content.
       Consumers target those directly.

    6. (reka-ui wrapper addendum) Trigger is a slot with `as-child`.

  Popover specifics:

    Class hooks:
      - olui-popover__content — the popover body rendered into the portal
      - olui-popover__arrow   — the arrow element, only when showArrow
      - olui-popover__close   — the dismiss button, only when showClose

    Data attributes (from reka-ui, not us):
      - data-state: "closed" | "open"
      - data-side:  "top" | "right" | "bottom" | "left"
      - data-align: "start" | "center" | "end"

    Custom properties:
      - --olui-popover-surface  (default var(--color-surface))
      - --olui-popover-border   (default var(--color-border))
      - --olui-popover-shadow   (default 0 8px 24px rgba(0,0,0,.35))
      - --olui-popover-padding  (default var(--gap))
      - --olui-popover-radius   (default var(--radius))
-->
<script setup lang="ts">
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  PopoverArrow,
  PopoverClose,
} from 'reka-ui';

withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    align?: 'start' | 'center' | 'end';
    modal?: boolean;
    showArrow?: boolean;
    showClose?: boolean;
  }>(),
  {
    side: 'bottom',
    sideOffset: 6,
    align: 'center',
    modal: false,
    showArrow: true,
    showClose: false,
  },
);
</script>

<template>
  <PopoverRoot :modal="modal">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="olui-popover__content"
        :side="side"
        :side-offset="sideOffset"
        :align="align"
      >
        <slot />
        <PopoverClose
          v-if="showClose"
          class="olui-popover__close"
          aria-label="Close"
        >
          ×
        </PopoverClose>
        <PopoverArrow
          v-if="showArrow"
          class="olui-popover__arrow"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style>
.olui-popover__content {
  --olui-popover-surface: var(--color-surface);
  --olui-popover-border: var(--color-border);
  --olui-popover-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --olui-popover-padding: var(--gap);
  --olui-popover-radius: var(--radius);

  position: relative;
  background: var(--olui-popover-surface);
  color: var(--color-text);
  border: 1px solid var(--olui-popover-border);
  border-radius: var(--olui-popover-radius);
  padding: var(--olui-popover-padding);
  box-shadow: var(--olui-popover-shadow);
  max-width: min(90vw, 360px);
  z-index: calc(var(--olui-modal-z-base, 1000) + 5);
}

.olui-popover__arrow {
  fill: var(--olui-popover-surface);
}

.olui-popover__close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.2em;
  line-height: 1;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.olui-popover__close:hover {
  background: var(--color-surface-hover, var(--color-border));
  color: var(--color-text);
}
</style>

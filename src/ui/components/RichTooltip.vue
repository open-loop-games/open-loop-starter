<!--
  RichTooltip — thin wrapper over reka-ui HoverCard primitives. The richer
  sibling of Tooltip: content has pointer events, is selectable, and can
  nest other RichTooltips inside it (Paradox-style drill-down). reka-ui
  owns delay, portal, positioning, a11y, and pointer-transit handling.

  Trigger is a slot with `as-child`, so the consumer's element becomes
  the trigger without a wrapping div.

  Costume class: olui-rich-tooltip__content. Reactive state comes from
  reka-ui's native data-state / data-side / data-align.
  Custom props: --rich-tooltip-{surface,border,shadow,padding,radius,max-width}.

  Defaults: 200ms open delay (snappier than reka's 700ms — we want
  breakdown-on-flick), 150ms close delay (long enough to move the cursor
  into the content when nesting).
-->
<script setup lang="ts">
import { HoverCardRoot, HoverCardTrigger, HoverCardPortal, HoverCardContent } from 'reka-ui';
import { usePortalTarget } from '@/lib/portal';

const portalTarget = usePortalTarget();

withDefaults(
  defineProps<{
    openDelay?: number;
    closeDelay?: number;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    align?: 'start' | 'center' | 'end';
  }>(),
  {
    openDelay: 200,
    closeDelay: 150,
    side: 'top',
    sideOffset: 6,
    align: 'center',
  },
);
</script>

<template>
  <HoverCardRoot :open-delay="openDelay" :close-delay="closeDelay">
    <HoverCardTrigger as-child>
      <slot />
    </HoverCardTrigger>
    <HoverCardPortal :to="portalTarget">
      <HoverCardContent
        class="olui-rich-tooltip__content"
        :side="side"
        :side-offset="sideOffset"
        :align="align"
      >
        <slot name="content" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style>
.olui-rich-tooltip__content {
  /* Read each token, never set it, so a value set on any ancestor reaches the widget. */
  --_rich-tooltip-surface: var(--rich-tooltip-surface, var(--color-surface));
  --_rich-tooltip-border: var(--rich-tooltip-border, var(--color-border));
  --_rich-tooltip-shadow: var(--rich-tooltip-shadow, 0 8px 24px rgba(0, 0, 0, 0.35));
  --_rich-tooltip-padding: var(--rich-tooltip-padding, var(--gap));
  --_rich-tooltip-radius: var(--rich-tooltip-radius, var(--radius));
  --_rich-tooltip-max-width: var(--rich-tooltip-max-width, 360px);

  background: var(--_rich-tooltip-surface);
  color: var(--color-text);
  border: 1px solid var(--_rich-tooltip-border);
  border-radius: var(--_rich-tooltip-radius);
  padding: var(--_rich-tooltip-padding);
  box-shadow: var(--_rich-tooltip-shadow);
  max-width: var(--_rich-tooltip-max-width);
  font-size: 0.9em;
  line-height: 1.4;
  z-index: calc(var(--modal-z-base, 1000) + 10);
}
</style>

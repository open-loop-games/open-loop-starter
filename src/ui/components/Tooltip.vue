<!--
  Tooltip — thin wrapper over reka-ui Tooltip primitives. reka-ui owns
  delay, portal, positioning, a11y, and dismiss. This wrapper adds the
  class hook on the content element, custom-property defaults, and a
  400ms default delay. Trigger is a slot with `as-child`, so the
  consumer's element becomes the trigger without a wrapping div.

  Class hook: olui-tooltip__content (trigger has none — it's the
  consumer's element). Reactive state comes from reka-ui's native
  data-state / data-side / data-align — don't duplicate those.
  Custom props: --tooltip-{bg,text,padding,radius,max-width}.

  A TooltipProvider is mounted inside this component so it works
  standalone. AppFrame can also mount an outer one with `tooltipDelay`;
  inner providers override outer ones, per-instance `delay` overrides
  both.
-->
<script setup lang="ts">
import { ref } from 'vue';
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

const isOpen = ref(false);
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot
      v-model:open="isOpen"
      :disabled="disabled"
    >
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal v-if="isOpen">
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
  --tooltip-bg: var(--color-text);
  --tooltip-text: var(--color-bg);
  --tooltip-padding: 6px 10px;
  --tooltip-radius: var(--radius-sm);
  --tooltip-max-width: 260px;

  background: var(--tooltip-bg);
  color: var(--tooltip-text);
  padding: var(--tooltip-padding);
  border-radius: var(--tooltip-radius);
  max-width: var(--tooltip-max-width);
  font-size: 0.85em;
  line-height: 1.4;
  z-index: calc(var(--modal-z-base, 1000) + 10);
  pointer-events: none;
  user-select: none;
}
</style>

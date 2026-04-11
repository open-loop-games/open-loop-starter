<!--
  Popover — click-activated non-modal panel. Thin wrapper over reka-ui
  Popover primitives; the non-modal sibling of Tooltip. Trigger is a
  slot with `as-child`.

  Class hooks: olui-popover__content, olui-popover__arrow (when
  showArrow), olui-popover__close (when showClose). Reactive state
  comes from reka-ui (data-state / data-side / data-align).
  Custom props: --popover-{surface,border,shadow,padding,radius}.
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
  --popover-surface: var(--color-surface);
  --popover-border: var(--color-border);
  --popover-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --popover-padding: var(--gap);
  --popover-radius: var(--radius);

  position: relative;
  background: var(--popover-surface);
  color: var(--color-text);
  border: 1px solid var(--popover-border);
  border-radius: var(--popover-radius);
  padding: var(--popover-padding);
  box-shadow: var(--popover-shadow);
  max-width: min(90vw, 360px);
  z-index: calc(var(--modal-z-base, 1000) + 5);
}

.olui-popover__arrow {
  fill: var(--popover-surface);
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

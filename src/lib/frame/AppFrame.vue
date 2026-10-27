<script setup lang="ts">
import { provide, useTemplateRef } from 'vue';
import { TooltipProvider } from 'reka-ui';
import { ModalStack, useModalStack, modalStackKey, type ModalStackApi } from '../modal';
import { portalTargetKey } from '../portal';

// A class or attribute on AppFrame lands on the frame element, not on the
// TooltipProvider, which renders none: it is the costume scope, and the
// portaled surfaces mount inside it.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  theme?: 'light' | 'dark';
  stack?: ModalStackApi;
  /**
   * App-wide default tooltip delay in ms, forwarded to the frame's
   * TooltipProvider. Leave unset to use reka-ui's default (700ms). A
   * per-Tooltip `delay` prop still overrides this via the inner
   * provider that each Tooltip mounts for standalone use.
   */
  tooltipDelay?: number;
}>();

provide(modalStackKey, props.stack ?? useModalStack());
provide(portalTargetKey, useTemplateRef<HTMLElement>('frame'));
</script>

<template>
  <TooltipProvider :delay-duration="tooltipDelay">
    <div ref="frame" class="olui-app-frame" :data-theme="theme" v-bind="$attrs">
      <header v-if="$slots.header" class="olui-app-frame__header">
        <slot name="header" />
      </header>
      <main class="olui-app-frame__main">
        <slot />
      </main>
      <div v-if="$slots.toasts" class="olui-app-frame__toasts">
        <slot name="toasts" />
      </div>
      <ModalStack />
    </div>
  </TooltipProvider>
</template>

<style>
.olui-app-frame {
  display: flex;
  flex-direction: column;
  /* Fills a flex-column parent when the frame is embedded in other chrome;
     inert at the page root, where body is `display: block` and the min-height
     below does the sizing instead. */
  flex: 1 1 auto;
  min-height: var(--app-root-min-height, 100vh);
  background: var(--color-bg);
  color: var(--color-text);
}

/* A fixed-viewport shell scrolls its regions inside a bounded height, so the frame
   holding one takes that height rather than growing with its content. Embedded,
   the token is 0 and the host's flex chain grows the frame to fill it. */
.olui-app-frame:has(.olui-shell[data-viewport='fixed']) {
  height: var(--app-root-min-height, 100vh);
}

.olui-app-frame__header {
  flex: 0 0 auto;
}

.olui-app-frame__main {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
}

.olui-app-frame__toasts {
  position: fixed;
  bottom: var(--gap);
  right: var(--gap);
  z-index: var(--modal-z-base);
  pointer-events: none;
}

.olui-app-frame__toasts > * {
  pointer-events: auto;
}
</style>

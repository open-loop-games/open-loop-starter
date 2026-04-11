<script setup lang="ts">
import { provide } from 'vue';
import { TooltipProvider } from 'reka-ui';
import { ModalStack, useModalStack, modalStackKey, type ModalStackApi } from '../modal';

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
</script>

<template>
  <TooltipProvider :delay-duration="tooltipDelay">
    <div
      class="olui-app-frame"
      :data-theme="theme"
    >
      <header
        v-if="$slots.header"
        class="olui-app-frame__header"
      >
        <slot name="header" />
      </header>
      <main class="olui-app-frame__main">
        <slot />
      </main>
      <div
        v-if="$slots.toasts"
        class="olui-app-frame__toasts"
      >
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
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
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
  z-index: var(--olui-modal-z-base);
  pointer-events: none;
}

.olui-app-frame__toasts > * {
  pointer-events: auto;
}
</style>

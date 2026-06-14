<script setup lang="ts">
import { ref } from 'vue';
import { TooltipRoot, TooltipTrigger, TooltipPortal, TooltipContent } from 'reka-ui';

withDefaults(
  defineProps<{
    text?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    delayDuration?: number;
  }>(),
  {
    text: undefined,
    side: 'top',
    sideOffset: 6,
    delayDuration: undefined,
  },
);

const isOpen = ref(false);
</script>

<template>
  <TooltipRoot
    v-model:open="isOpen"
    :delay-duration="delayDuration"
  >
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal v-if="isOpen">
      <TooltipContent
        class="app-tooltip"
        :side="side"
        :side-offset="sideOffset"
      >
        <slot name="content">
          {{ text }}
        </slot>
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style scoped>
:global(.app-tooltip) {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 0.8em;
  line-height: 1.35;
  max-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  z-index: 1000;
  pointer-events: none;
}
</style>

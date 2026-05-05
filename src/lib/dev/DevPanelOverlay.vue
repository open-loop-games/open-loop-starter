<script setup lang="ts">
import Button from '@/ui/components/Button.vue';

withDefaults(
  defineProps<{
    title?: string;
  }>(),
  { title: 'Dev Panel' },
);

defineEmits<{ close: [] }>();
</script>

<template>
  <div class="olui-devpanel-overlay" tabindex="-1" @keydown.escape="$emit('close')">
    <div class="olui-devpanel-overlay__toolbar">
      <span class="olui-devpanel-overlay__title">{{ title }}</span>
      <div class="olui-devpanel-overlay__actions">
        <slot name="toolbar" />
        <Button type="button" class="olui-devpanel-overlay__close" @click="$emit('close')">
          ESC to close
        </Button>
      </div>
    </div>
    <div class="olui-devpanel-overlay__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.olui-devpanel-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--modal-z-base);
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
}

.olui-devpanel-overlay__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-muted);
}

.olui-devpanel-overlay__title {
  font-family: var(--font-mono);
}

.olui-devpanel-overlay__actions {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}

.olui-devpanel-overlay__close {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}

.olui-devpanel-overlay__close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.olui-devpanel-overlay__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
</style>

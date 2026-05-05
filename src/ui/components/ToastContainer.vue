<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useToasts } from '@/composables/useToasts';

const { toasts, removeToast } = useToasts();
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast-item">
        <div class="toast-header">
          <strong>{{ toast.title }}</strong>
          <Button class="toast-close" aria-label="Dismiss" @click="removeToast(toast.id)">
            ×
          </Button>
        </div>
        <div v-if="toast.content" class="toast-body">
          {{ toast.content }}
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--gap-sm);
  max-width: 360px;
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  min-width: 200px;
}

.toast-header {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 0.4rem 0.6rem;
  background: var(--color-surface-alt, var(--color-surface));
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85em;
}

.toast-close {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0 0.25rem;
  opacity: 0.6;
}

.toast-close:hover {
  opacity: 1;
}

.toast-body {
  padding: 0.4rem 0.6rem;
  font-size: 0.8em;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

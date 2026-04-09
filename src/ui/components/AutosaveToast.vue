<script setup lang="ts">
import { ref, watch } from 'vue';
import { lastSaveTimestamp } from '@/modules/settings';

const visible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

watch(lastSaveTimestamp, (ts) => {
  if (ts === 0) return;
  visible.value = true;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    visible.value = false;
  }, 1500);
});
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="autosave-toast">Saved</div>
  </Transition>
</template>

<style scoped>
.autosave-toast {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 6px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.85em;
  z-index: 50;
  pointer-events: none;
}

.toast-enter-active {
  transition: opacity 0.2s ease;
}

.toast-leave-active {
  transition: opacity 0.4s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>

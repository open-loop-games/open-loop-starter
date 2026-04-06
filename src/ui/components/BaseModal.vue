<script setup lang="ts">
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn-sm" @click="emit('close')">X</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  min-width: 360px;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 1.1em;
}

.modal-body {
  padding: var(--gap-lg);
  overflow-y: auto;
}
</style>

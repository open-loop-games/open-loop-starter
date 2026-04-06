<script setup lang="ts">
import type { SlotInfo } from '@/composables/useSlots';

defineProps<{
  info: SlotInfo;
  active: boolean;
  modName?: string;
  timeAgo: string;
}>();

defineEmits<{
  load: [];
  delete: [];
}>();
</script>

<template>
  <div class="slot-card" :class="{ active }">
    <div class="slot-info">
      <span class="slot-name">{{ info.name }}</span>
      <span v-if="modName" class="badge">{{ modName }}</span>
      <span v-if="timeAgo" class="slot-time">{{ timeAgo }}</span>
    </div>
    <div class="slot-actions">
      <button class="btn-primary btn-sm" @click="$emit('load')">Load</button>
      <button class="btn-danger btn-sm" @click="$emit('delete')">Delete</button>
    </div>
  </div>
</template>

<style scoped>
.slot-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.slot-card.active {
  border-color: var(--color-primary);
}

.slot-info {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}

.slot-name {
  font-weight: 600;
}

.slot-time {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.slot-actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

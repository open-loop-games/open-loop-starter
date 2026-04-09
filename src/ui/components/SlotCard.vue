<script setup lang="ts">
import { computed } from 'vue';
import { formatTime } from 'open-loop-engine';
import type { SlotInfo } from '@/composables/useSlots';

const props = defineProps<{
  info: SlotInfo;
  active: boolean;
  modName?: string;
  timeAgo: string;
}>();

defineEmits<{
  load: [];
  delete: [];
}>();

const metadata = computed(() => props.info.peek?.metadata as Record<string, unknown> | undefined);
const loopCount = computed(() => metadata.value?.loopCount as number | undefined);
const playtime = computed(() => metadata.value?.playtime as number | undefined);
</script>

<template>
  <div class="slot-card" :class="{ active }">
    <div class="slot-info">
      <div class="slot-header">
        <span class="slot-name">{{ info.name }}</span>
        <span v-if="modName" class="badge">{{ modName }}</span>
        <span v-if="timeAgo" class="slot-time">{{ timeAgo }}</span>
      </div>
      <div v-if="metadata" class="slot-meta">
        <span v-if="loopCount != null">Loops: {{ loopCount }}</span>
        <span v-if="playtime != null">Playtime: {{ formatTime(playtime) }}</span>
      </div>
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
  flex-direction: column;
  gap: 4px;
}

.slot-header {
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

.slot-meta {
  display: flex;
  gap: var(--gap);
  font-size: 0.8em;
  color: var(--color-text-muted);
}

.slot-actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

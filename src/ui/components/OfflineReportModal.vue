<script setup lang="ts">
import { formatTime } from 'open-loop-engine';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  elapsed: number;
  gains: Record<string, string>;
}>();
const emit = defineEmits<{ close: [] }>();

const hasGains = Object.keys(props.gains).length > 0;
</script>

<template>
  <BaseModal title="While You Were Away" @close="emit('close')">
    <div class="offline-report">
      <p class="time-away">You were offline for <strong>{{ formatTime(elapsed) }}</strong></p>

      <div v-if="hasGains" class="gains">
        <div v-for="(value, label) in gains" :key="label" class="gain-row">
          <span class="gain-label">{{ label }}</span>
          <span class="gain-value">{{ value }}</span>
        </div>
      </div>
      <p v-else class="no-gains">No progress was made while you were away.</p>

      <button class="btn-primary" @click="emit('close')">Continue</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.offline-report {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  align-items: center;
  text-align: center;
}

.time-away {
  font-size: 1.1em;
}

.gains {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  width: 100%;
}

.gain-row {
  display: flex;
  justify-content: space-between;
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.gain-label {
  color: var(--color-text-muted);
}

.gain-value {
  font-weight: 600;
  color: var(--color-success);
}

.no-gains {
  color: var(--color-text-muted);
}
</style>

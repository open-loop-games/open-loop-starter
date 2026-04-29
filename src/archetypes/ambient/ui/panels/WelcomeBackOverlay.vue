<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import { useFormatting } from '@/composables/useFormatting';

defineProps<{
  /** Offline gap in seconds at the moment the overlay was pushed. */
  gapSec: number;
}>();
defineEmits<{ close: [] }>();

const { formatTime } = useFormatting();
</script>

<template>
  <div
    class="welcome-card"
    data-testid="welcome-back-overlay"
    @click="$emit('close')"
  >
    <DialogTitle as-child>
      <h3 class="welcome-title">
        Welcome back
      </h3>
    </DialogTitle>
    <p class="welcome-gap">
      Away for <strong>{{ formatTime(gapSec) }}</strong>
    </p>
    <!-- TODO(expansion): accumulated-delta + affordable-queue surfacing -->
    <p class="welcome-cta">
      Click to dismiss
    </p>
  </div>
</template>

<style scoped>
.welcome-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  cursor: pointer;
}

.welcome-title {
  font-size: 1.2em;
  margin: 0;
}

.welcome-gap {
  margin: 0;
  color: var(--color-text);
}

.welcome-cta {
  margin: 0;
  font-size: 0.78em;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>

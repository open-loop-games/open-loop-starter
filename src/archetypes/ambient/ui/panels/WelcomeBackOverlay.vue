<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useSessionClock } from '../../composables/useSessionClock';
import { useUnlocks } from '../../composables/useUnlocks';
import { useFormatting } from '@/composables/useFormatting';

const MIN_GAP_SEC = 60;
const UNLOCK_ID = 'returns-welcomed';

const sessionClock = useSessionClock();
const unlocks = useUnlocks();
const { formatTime } = useFormatting();

const dismissed = ref(false);
const capturedGap = ref(0);

const enabled = ref(false);

function dismiss(): void {
  dismissed.value = true;
}

function onKey(e: KeyboardEvent): void {
  if (!enabled.value || dismissed.value) return;
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault();
    dismiss();
  }
}

onMounted(() => {
  capturedGap.value = sessionClock.lastResumeGapSec.value;
  const unlocked = unlocks.getPurchasable(UNLOCK_ID)?.bought.value === true;
  enabled.value = unlocked && capturedGap.value >= MIN_GAP_SEC;
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div
    v-if="enabled && !dismissed"
    class="welcome-back-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Welcome back"
    data-testid="welcome-back-overlay"
    tabindex="0"
    @click="dismiss"
  >
    <div class="welcome-card">
      <h3 class="welcome-title">
        Welcome back
      </h3>
      <p class="welcome-gap">
        Away for <strong>{{ formatTime(capturedGap) }}</strong>
      </p>
      <!-- TODO(expansion): accumulated-delta + affordable-queue surfacing -->
      <p class="welcome-cta">
        Click to dismiss
      </p>
    </div>
  </div>
</template>

<style scoped>
.welcome-back-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  cursor: pointer;
}

.welcome-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-lg) var(--gap-lg);
  min-width: 320px;
  max-width: 420px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
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

<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle } from 'reka-ui';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import { useFormatting } from '@/composables/useFormatting';

const props = defineProps<{
  /** Offline gap in seconds at the moment the overlay was pushed. */
  gapSec: number;
  /** Sprouts grown during the offline catch-up (post − pre). */
  sproutDelta: DecimalSource;
}>();
defineEmits<{ close: [] }>();

const { format, formatTime } = useFormatting();
const showDelta = computed(() => Decimal.fromValue(props.sproutDelta).gt(0));
</script>

<template>
  <div
    class="welcome-card"
    data-testid="welcome-back-overlay"
    @click="$emit('close')"
  >
    <span
      class="welcome-card__rule welcome-card__rule--top"
      aria-hidden="true"
    />
    <DialogTitle as-child>
      <h3 class="welcome-card__title">
        Welcome back
      </h3>
    </DialogTitle>
    <p class="welcome-card__gap">
      Away for <em>{{ formatTime(gapSec) }}</em>
    </p>
    <p
      v-if="showDelta"
      class="welcome-card__delta"
    >
      The garden grew
      <span class="welcome-card__delta-value">{{ format(sproutDelta, 0) }}</span>
      sprouts while you were out.
    </p>
    <p
      v-else
      class="welcome-card__delta welcome-card__delta--quiet"
    >
      Nothing pressing &mdash; the garden is much as you left it.
    </p>
    <span
      class="welcome-card__rule welcome-card__rule--bottom"
      aria-hidden="true"
    />
    <p class="welcome-card__cta">
      Click to dismiss
    </p>
    <!-- TODO(expansion): affordable-queue surfacing — name what's newly
         within reach (e.g. "the orchard is ready to plant"). Requires
         capturing canAfford state pre-/post-catchup, parallel to the
         primary snapshot. -->
  </div>
</template>

<style scoped>
.welcome-card {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px 6px;
  cursor: pointer;
  font-family: var(--font-body, Georgia, serif);
  color: var(--almanac-evergreen, var(--color-text));
}

.welcome-card__rule {
  display: block;
  height: 1px;
  width: 60%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--almanac-rule-soft, rgba(168, 158, 139, 0.5)) 12%,
    var(--almanac-rule, var(--color-border)) 50%,
    var(--almanac-rule-soft, rgba(168, 158, 139, 0.5)) 88%,
    transparent 100%
  );
  opacity: 0.7;
}

.welcome-card__rule--top {
  margin-bottom: 4px;
}

.welcome-card__rule--bottom {
  margin-top: 8px;
}

.welcome-card__title {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.9em;
  letter-spacing: 0.02em;
  color: var(--almanac-evergreen, var(--color-text));
  margin: 0;
}

.welcome-card__gap {
  margin: 0;
  font-style: italic;
  font-size: 1.05em;
  color: var(--almanac-pencil, var(--color-text-muted));
}

.welcome-card__gap em {
  font-style: italic;
  font-weight: 600;
  color: var(--almanac-evergreen, var(--color-text));
  font-variant-numeric: tabular-nums oldstyle-nums;
  margin: 0 2px;
}

.welcome-card__delta {
  margin: 0;
  font-size: 1.1em;
  color: var(--almanac-evergreen, var(--color-text));
  line-height: 1.55;
  max-width: 340px;
}

.welcome-card__delta-value {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 600;
  color: var(--almanac-stamp, var(--color-danger));
  font-variant-numeric: tabular-nums oldstyle-nums;
  margin: 0 2px;
}

.welcome-card__delta--quiet {
  font-style: italic;
  color: var(--almanac-moss, var(--color-text-muted));
}

.welcome-card__cta {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 0.78em;
  font-style: italic;
  color: var(--almanac-pencil, var(--color-text-muted));
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
</style>

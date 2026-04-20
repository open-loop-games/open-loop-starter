<script setup lang="ts">
import { computed } from 'vue';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useClickState } from '../../composables/useClickState';
import { useFormatting } from '@/composables/useFormatting';

const { primary, lifetime, perSecond } = useHeadlineRate();
const click = useClickState();
const { format, formatWhole } = useFormatting();

// primary is a Resource<DecimalSource> (Ref subtype). Vue auto-unwraps refs
// in templates at runtime, but the template type-checker doesn't peel the
// Resource brand, so we materialise the inner value here for a clean pass.
const cookies = computed(() => primary.value);
</script>

<template>
  <div class="headline-panel">
    <div class="headline-stats">
      <div
        class="cookies"
        data-testid="cookie-count"
      >
        {{ format(cookies, 0) }}
      </div>
      <div class="rate">
        {{ format(perSecond, 1) }} / sec
      </div>
      <div class="lifetime">
        Lifetime: {{ format(lifetime, 0) }}
      </div>
    </div>

    <button
      class="big-cookie-button"
      data-testid="click-cookie"
      @click="click.click"
    >
      <span class="cookie-glyph">🍪</span>
      <span class="cookie-label">Bake</span>
    </button>

    <div class="click-stats">
      <span>{{ formatWhole(click.clickCount.value) }} clicks</span>
    </div>
  </div>
</template>

<style scoped>
.headline-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-lg);
  padding: var(--gap-lg);
  min-height: 0;
}

.headline-stats {
  text-align: center;
}

.cookies {
  font-size: 2.6em;
  font-weight: 700;
  color: var(--color-primary);
}

.rate {
  font-size: 1em;
  color: var(--color-text-muted);
  margin-top: var(--gap-sm);
}

.lifetime {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.big-cookie-button {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 3px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  cursor: pointer;
  transition:
    transform 0.1s ease-out,
    background 0.15s;
}

.big-cookie-button:hover {
  background: var(--color-surface-hover);
  transform: scale(1.02);
}

.big-cookie-button:active {
  transform: scale(0.96);
}

.cookie-glyph {
  font-size: 6em;
  line-height: 1;
}

.cookie-label {
  font-size: 0.95em;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.click-stats {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
</style>

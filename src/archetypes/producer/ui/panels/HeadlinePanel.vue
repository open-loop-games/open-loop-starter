<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useClickState } from '../../composables/useClickState';
import { useProducerChainBreakdown } from '../../composables/useChainBreakdown';
import { useFormatting } from '@/composables/useFormatting';

const { primary, lifetime, perSecond } = useHeadlineRate();
const click = useClickState();
const { format, formatWhole } = useFormatting();

const cookies = computed(() => primary.value);

// Cursor carries the richest stack (globals + achievements + cursor upgrades
// + cursor milestones) so it reads as the headline factor list. If cursor is
// missing the breakdown simply resolves to an empty list.
const breakdown = useProducerChainBreakdown('cursor');
const expanded = ref(false);
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

    <Button
      class="big-cookie-button"
      data-testid="click-cookie"
      @click="click.click"
    >
      <span class="cookie-glyph">🍪</span>
      <span class="cookie-label">Bake</span>
    </Button>

    <div class="click-stats">
      <span>{{ formatWhole(click.clickCount.value) }} clicks</span>
    </div>

    <section class="chain-breakdown">
      <Button
        class="chain-toggle"
        data-testid="toggle-chain-breakdown"
        @click="expanded = !expanded"
      >
        <span>Multipliers</span>
        <span class="chain-count">
          {{ breakdown.activeCount }} / {{ breakdown.factors.length }}
        </span>
        <span class="chain-caret">{{ expanded ? '▲' : '▼' }}</span>
      </Button>
      <ul
        v-if="expanded"
        class="chain-list"
        data-testid="chain-breakdown"
      >
        <li
          v-for="factor in breakdown.factors"
          :key="factor.id"
          class="chain-factor"
          :class="{ 'is-inactive': !factor.active, 'is-bad': factor.isBad }"
          :data-testid="`chain-factor-${factor.id}`"
        >
          <span class="chain-factor__text">{{ factor.text }}</span>
          <span class="chain-factor__value">{{ factor.formattedValue }}</span>
        </li>
        <li
          v-if="breakdown.factors.length === 0"
          class="chain-empty"
        >
          No upgrades or achievements applied yet.
        </li>
      </ul>
    </section>
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

.chain-breakdown {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.chain-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-sm);
  width: 100%;
  padding: 6px 10px;
  font-size: 0.85em;
  letter-spacing: 0.04em;
}

.chain-count {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.chain-caret {
  font-size: 0.75em;
  color: var(--color-text-muted);
}

.chain-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  max-height: 260px;
  overflow-y: auto;
}

.chain-factor {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: 2px 4px;
  font-size: 0.82em;
}

.chain-factor__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chain-factor__value {
  font-variant-numeric: tabular-nums;
  color: var(--color-success);
  font-weight: 600;
}

.chain-factor.is-inactive {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.chain-factor.is-inactive .chain-factor__value {
  color: var(--color-text-muted);
  font-weight: 400;
}

.chain-factor.is-bad .chain-factor__value {
  color: var(--color-danger, var(--color-text-muted));
}

.chain-empty {
  font-size: 0.82em;
  color: var(--color-text-muted);
  text-align: center;
  padding: 4px;
}
</style>

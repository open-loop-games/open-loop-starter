<!--
  Tier-header band: title, cumulative currency display, optional
  shards-rate readout, optional reset button with embedded progress.

  Reset button only renders for tiers whose config carries a
  `conversionKey` (Prestige + Transcend). Antimatter has no UI reset
  affordance — its reset cascades from Prestige's.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, formatWhole } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';
import type { TierState } from '../../composables/useTier';

const props = defineProps<{ tier: TierState }>();

const currencyAmount = computed(() => formatWhole(props.tier.currency.value));

const shardRate = computed(() => {
  const rate = props.tier.totalRate?.value;
  if (rate === undefined) return null;
  return `${format(rate, 2)}/s`;
});

const resetReady = computed(() => props.tier.reset?.canConvert.value ?? false);

const projectedGain = computed(() => {
  const gain = props.tier.reset?.currentGain.value;
  if (gain === undefined) return null;
  return formatWhole(gain);
});

function performReset(): void {
  if (!resetReady.value) return;
  props.tier.reset?.perform();
}
</script>

<template>
  <header class="scaler-tier-header">
    <div class="scaler-tier-header__title">
      <h3>{{ tier.display.title }}</h3>
      <div class="scaler-tier-header__currency">
        <span class="scaler-tier-header__currency-amount">{{ currencyAmount }}</span>
        <span class="scaler-tier-header__currency-label">{{ tier.display.currencyDisplay }}</span>
      </div>
      <div v-if="shardRate !== null" class="scaler-tier-header__rate">
        {{ shardRate }}
      </div>
    </div>

    <div v-if="tier.reset" class="scaler-tier-header__reset">
      <Button
        class="scaler-tier-header__reset-btn"
        :disabled="!resetReady"
        :data-state="resetReady ? 'ready' : 'pending'"
        @click="performReset"
      >
        <span class="scaler-tier-header__reset-label">
          {{ tier.display.title }}
          <span v-if="resetReady && projectedGain !== null" class="scaler-tier-header__reset-gain"
            >+{{ projectedGain }} {{ tier.display.currencyDisplay }}</span
          >
          <span v-else class="scaler-tier-header__reset-next">Not yet ready</span>
        </span>
      </Button>
    </div>
  </header>
</template>

<style scoped>
.scaler-tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-strong, var(--color-surface));
}
.scaler-tier-header__title {
  display: flex;
  align-items: baseline;
  gap: var(--gap);
  flex-wrap: wrap;
}
.scaler-tier-header__title h3 {
  margin: 0;
  font-size: 1.05em;
  font-weight: 700;
}
.scaler-tier-header__currency {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.scaler-tier-header__currency-amount {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 1.1em;
}
.scaler-tier-header__currency-label {
  color: var(--color-text-muted);
  font-size: 0.9em;
}
.scaler-tier-header__rate {
  color: var(--color-text-muted);
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
}
.scaler-tier-header__reset {
  flex: 0 0 auto;
}
.scaler-tier-header__reset-btn {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  min-width: 220px;
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s,
    box-shadow 0.1s;
}
.scaler-tier-header__reset-btn[data-state='ready'] {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, var(--color-surface));
  box-shadow: 0 0 0 1px var(--color-primary) inset;
}
.scaler-tier-header__reset-btn:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}
.scaler-tier-header__reset-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.scaler-tier-header__reset-gain {
  font-size: 0.85em;
  color: var(--color-primary);
  font-weight: 600;
}
.scaler-tier-header__reset-next {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.scaler-tier-header__reset-progress {
  width: 100%;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';
import {
  getTranscendPoints,
  getCoinsThisTranscension,
  getTranscendConversion,
  getTranscendPointGain,
  getAcceleratorBoostBought,
  getAcceleratorBoostCost,
  getPrestigePoints,
  boostAccelerator,
} from '../modules';
import { SCALER_BALANCE } from '../data';

const transcendPoints = getTranscendPoints();
const coinsThisTranscension = getCoinsThisTranscension();
const conversion = getTranscendConversion();
const gain = getTranscendPointGain();
const prestigePoints = getPrestigePoints();
const boostBought = getAcceleratorBoostBought();
const boostCost = getAcceleratorBoostCost();

const canConvert = computed(() => conversion.canConvert.value);
const gainDisplay = computed(() => format(gain.value, 0));
const earnedThisCycle = computed(() => format(coinsThisTranscension.value, 0));
const boostCostDisplay = computed(() => format(boostCost.value, 0));
const canBoost = computed(() => Decimal.gte(prestigePoints.value, boostCost.value));
// Boost contributes acceleratorPower ^ (5 × bought) to coin rateChains —
// readout shows the running multiplier so the player sees the discrete grant.
const boostMultiplierDisplay = computed(() =>
  format(
    Decimal.pow(
      SCALER_BALANCE.acceleratorPower,
      SCALER_BALANCE.acceleratorBoostFreeAccelPerBuy * boostBought.value,
    ),
    2,
  ),
);

function doTranscend(): void {
  if (!canConvert.value) return;
  conversion.convert();
}

function doBoost(): void {
  if (!canBoost.value) return;
  boostAccelerator();
}
</script>

<template>
  <div class="transcend-panel">
    <section class="transcend-panel__action">
      <header class="transcend-panel__head">
        <h3>Transcend</h3>
        <p>
          Convert coins-this-transcension into transcend points; coin and prestige tiers reset
          (including prestige points), but transcend points carry across cycles.
        </p>
      </header>
      <div class="transcend-panel__stats">
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">Coins this transcension</span>
          <span class="transcend-panel__stat-value">{{ earnedThisCycle }}</span>
        </div>
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">TP gain on transcend</span>
          <span class="transcend-panel__stat-value">{{ gainDisplay }}</span>
        </div>
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">Total transcend points</span>
          <span class="transcend-panel__stat-value">{{ format(transcendPoints, 0) }}</span>
        </div>
      </div>
      <Button
        :disabled="!canConvert"
        class="transcend-panel__button"
        @click="doTranscend"
      >
        Transcend (+{{ gainDisplay }} TP)
      </Button>
      <p
        v-if="!canConvert"
        class="transcend-panel__hint"
      >
        Need 1e100 coins this transcension, or TP gain ≥ 0.5.
      </p>
    </section>

    <section class="transcend-panel__action">
      <header class="transcend-panel__head">
        <h3>Accelerator Boost</h3>
        <p>
          Spend prestige points to grant 5 free Accelerator levels per buy and reset prestige. Boost
          count zeros on transcend.
        </p>
      </header>
      <div class="transcend-panel__stats">
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">Owned</span>
          <span class="transcend-panel__stat-value">{{ boostBought }}</span>
        </div>
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">Multiplier</span>
          <span class="transcend-panel__stat-value">×{{ boostMultiplierDisplay }}</span>
        </div>
        <div class="transcend-panel__stat">
          <span class="transcend-panel__stat-label">Next cost (PP)</span>
          <span class="transcend-panel__stat-value">{{ boostCostDisplay }}</span>
        </div>
      </div>
      <Button
        :disabled="!canBoost"
        class="transcend-panel__button"
        @click="doBoost"
      >
        Boost Accelerator
      </Button>
      <p
        v-if="!canBoost"
        class="transcend-panel__hint"
      >
        Need {{ boostCostDisplay }} prestige points; buy fires a prestige reset.
      </p>
    </section>
  </div>
</template>

<style scoped>
.transcend-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.transcend-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.transcend-panel__head p {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.transcend-panel__action {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.transcend-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap-sm);
}
.transcend-panel__stat {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.transcend-panel__stat-label {
  font-size: 0.75em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.transcend-panel__stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.transcend-panel__button {
  align-self: flex-start;
}
.transcend-panel__hint {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
@media (max-width: 720px) {
  .transcend-panel__stats {
    grid-template-columns: 1fr;
  }
}
</style>

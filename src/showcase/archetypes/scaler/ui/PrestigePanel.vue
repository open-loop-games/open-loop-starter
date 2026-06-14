<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import {
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
  getPrestigeConversion,
  getPrestigePointGain,
  getCrystalUpgrades,
} from '../modules';
import { CRYSTAL_UPGRADES } from '../data';
import CrystalRow from './CrystalRow.vue';

const prestigePoints = getPrestigePoints();
const prestigeShards = getPrestigeShards();
const coinsThisPrestige = getCoinsThisPrestige();
const conversion = getPrestigeConversion();
const gain = getPrestigePointGain();
const crystals = getCrystalUpgrades();

const canConvert = computed(() => conversion.canConvert.value);
const gainDisplay = computed(() => format(gain.value, 0));
const earnedThisCycle = computed(() => format(coinsThisPrestige.value, 0));

function doPrestige(): void {
  if (!canConvert.value) return;
  conversion.convert();
}

const crystalRows = CRYSTAL_UPGRADES.map((def, i) => ({
  def,
  purchasable: crystals[i],
}));

const totalCrystalLevels = computed(() =>
  crystals.reduce((sum, p) => Decimal.add(sum, p.amount.value), Decimal.dZero),
);
</script>

<template>
  <div class="prestige-panel">
    <section class="prestige-panel__action">
      <header class="prestige-panel__head">
        <h3>Prestige</h3>
        <p>
          Convert coins-this-cycle into prestige points; coin tier resets, but prestige points carry
          across cycles.
        </p>
      </header>
      <div class="prestige-panel__stats">
        <div class="prestige-panel__stat">
          <span class="prestige-panel__stat-label">Coins this cycle</span>
          <span class="prestige-panel__stat-value">{{ earnedThisCycle }}</span>
        </div>
        <div class="prestige-panel__stat">
          <span class="prestige-panel__stat-label">PP gain on prestige</span>
          <span class="prestige-panel__stat-value">{{ gainDisplay }}</span>
        </div>
        <div class="prestige-panel__stat">
          <span class="prestige-panel__stat-label">Total prestige points</span>
          <span class="prestige-panel__stat-value">{{ format(prestigePoints, 0) }}</span>
        </div>
      </div>
      <Button
        :disabled="!canConvert"
        class="prestige-panel__button"
        @click="doPrestige"
      >
        Prestige (+{{ gainDisplay }} PP)
      </Button>
      <p
        v-if="!canConvert"
        class="prestige-panel__hint"
      >
        Need 1e16 coins this cycle, or PP gain ≥ 100.
      </p>
    </section>

    <section class="prestige-panel__crystals">
      <header class="prestige-panel__head">
        <h3>Crystal upgrades</h3>
        <p>
          Per-cycle micro-loop. Cost prestige shards (regenerate from Diamond production); levels
          reset on every prestige.
        </p>
        <p class="prestige-panel__hint">
          Shards: {{ format(prestigeShards, 0) }} · Total Crystal levels:
          {{ format(totalCrystalLevels, 0) }}
        </p>
      </header>
      <div class="prestige-panel__crystal-grid">
        <CrystalRow
          v-for="row in crystalRows"
          :key="row.def.id"
          :purchasable="row.purchasable"
          :position="row.def.position"
          :name="row.def.name"
          :description="row.def.description"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.prestige-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.prestige-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.prestige-panel__head p {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.prestige-panel__action {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.prestige-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap-sm);
}
.prestige-panel__stat {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.prestige-panel__stat-label {
  font-size: 0.75em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.prestige-panel__stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.prestige-panel__button {
  align-self: flex-start;
}
.prestige-panel__hint {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.prestige-panel__crystals {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.prestige-panel__crystal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: var(--gap-sm);
}
@media (max-width: 720px) {
  .prestige-panel__crystal-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .prestige-panel__stats {
    grid-template-columns: 1fr;
  }
}
</style>

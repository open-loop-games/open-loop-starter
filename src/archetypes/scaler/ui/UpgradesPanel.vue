<script setup lang="ts">
import { getCoinUpgrades } from '../modules';
import UpgradeCell from './UpgradeCell.vue';

const upgrades = getCoinUpgrades();
</script>

<template>
  <div class="upgrades-panel">
    <header class="upgrades-panel__head">
      <h3>Coin upgrades</h3>
      <p>One-time buys that boost coin production.</p>
    </header>
    <div class="upgrades-panel__grid">
      <UpgradeCell
        v-for="entry in upgrades.getAll()"
        :key="entry.def.id"
        :purchasable="entry.purchasable"
        :position="entry.def.position"
        :name="entry.def.name"
        :description="entry.def.description"
      />
    </div>
  </div>
</template>

<style scoped>
.upgrades-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.upgrades-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.upgrades-panel__head p {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.upgrades-panel__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: var(--gap-sm);
}
@media (max-width: 720px) {
  .upgrades-panel__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

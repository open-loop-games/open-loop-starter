<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';

const ad = useModule(AntimatterDimensionsKey);

const rows = computed(() =>
  ad.ipUpgrades.getAll().map(({ def, purchasable }) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    cost: format(Decimal.fromValue(def.cost)),
    bought: purchasable.bought.value,
    canBuy: purchasable.canPurchase.value,
  })),
);

function buy(id: string): void {
  const entry = ad.ipUpgrades.getPurchasable(id);
  if (entry && entry.canPurchase.value) entry.purchase();
}
</script>

<template>
  <section class="ad-ip-upgrades-panel">
    <h3>Infinity Upgrades</h3>
    <div class="upgrade-grid">
      <div
        v-for="row in rows"
        :key="row.id"
        :class="['upgrade-card', { bought: row.bought }]"
      >
        <div class="info">
          <span class="title">{{ row.title }}</span>
          <span class="desc">{{ row.description }}</span>
        </div>
        <button
          v-if="!row.bought"
          class="btn-sm"
          :disabled="!row.canBuy"
          @click="buy(row.id)"
        >
          Buy
          <span class="cost">({{ row.cost }} IP)</span>
        </button>
        <span
          v-else
          class="owned"
        >Owned</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ad-ip-upgrades-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--gap-sm);
}
.upgrade-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.upgrade-card.bought {
  border-color: var(--color-primary);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title {
  font-weight: 600;
}
.desc {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.cost {
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-left: 4px;
}
.owned {
  align-self: flex-start;
  font-size: 0.85em;
  color: var(--color-primary);
  font-weight: 600;
}
</style>

<script setup lang="ts">
import { toValue } from 'vue';
import { format, type DecimalSource } from 'open-loop-engine';
import { type Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { EconomyKey } from '@/modules/village-gatherer/economy';

const e = useModule(EconomyKey);

const upgrades = [
  { p: e.upgrades.sharpAxe, costResource: 'Wood' },
  { p: e.upgrades.ironPickaxe, costResource: 'Gold' },
  { p: e.upgrades.foreman, costResource: 'Gold' },
];

function buy(p: Purchasable) {
  if (p.canPurchase.value) p.purchase();
}
</script>

<template>
  <section class="upgrades-panel">
    <h3>Upgrades</h3>
    <div class="upgrade-list">
      <div
        v-for="u in upgrades"
        :key="u.p.id"
        class="upgrade-card"
      >
        <div class="info">
          <span class="title">{{ u.p.display.title }}</span>
          <span class="desc">{{ u.p.display.description }}</span>
          <span class="owned">
            Level {{ format(u.p.amount.value) }} / {{ format(toValue(u.p.limit) as DecimalSource) }}
          </span>
        </div>
        <button
          class="btn-sm"
          :disabled="!u.p.canPurchase.value"
          @click="buy(u.p)"
        >
          <template v-if="u.p.maxed.value">
            Maxed
          </template>
          <template v-else>
            Buy ({{ format(u.p.getCost()) }} {{ u.costResource }})
          </template>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.upgrades-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.upgrade-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.upgrade-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.title {
  font-weight: 600;
}
.desc,
.owned {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';

const ad = useModule(AntimatterDimensionsKey);

const rows = computed(() =>
  ad.dims.map((dim) => ({
    id: dim.def.id,
    name: dim.def.name,
    description: dim.def.description,
    count: format(Decimal.floor(dim.count.value)),
    bought: new Decimal(dim.purchasable.amount.value).toNumber(),
    rate: format(Decimal.mul(dim.computedRate.value, dim.count.value), 2),
    cost: format(dim.purchasable.getCost()),
    canBuy: dim.purchasable.canPurchase.value,
  })),
);

function buy(id: string): void {
  const dim = ad.dims.find((d) => d.def.id === id);
  if (dim && dim.purchasable.canPurchase.value) {
    dim.purchasable.purchase();
  }
}
</script>

<template>
  <section class="ad-dimensions-panel">
    <h3>Dimensions</h3>
    <div class="dim-list">
      <div
        v-for="row in rows"
        :key="row.id"
        class="dim-card"
      >
        <div class="info">
          <span class="name">{{ row.name }}</span>
          <span class="desc">{{ row.description }}</span>
          <span class="stat">
            Count: {{ row.count }}
            <span class="muted">({{ row.bought }} bought)</span>
          </span>
          <span class="stat">Produces: {{ row.rate }}/s</span>
        </div>
        <button
          v-hold-repeat="() => buy(row.id)"
          class="btn-sm"
          :disabled="!row.canBuy"
        >
          Buy
          <span class="cost">({{ row.cost }})</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ad-dimensions-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.dim-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.dim-card {
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
.name {
  font-weight: 600;
}
.desc,
.stat {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.muted {
  opacity: 0.7;
}
.cost {
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-left: 4px;
}
</style>

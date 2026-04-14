<script setup lang="ts">
import { toValue } from 'vue';
import { format, type DecimalSource, type Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CookieFactoryKey } from '@/modules/mods/cookie-factory';

const cf = useModule(CookieFactoryKey);

function buy(p: Purchasable) {
  if (p.canPurchase.value) p.purchase();
}
</script>

<template>
  <section class="upgrades-panel">
    <h3>Upgrades</h3>
    <div class="upgrade-list">
      <div
        v-for="up in cf.upgrades"
        :key="up.id"
        class="upgrade-card"
      >
        <div class="info">
          <span class="title">{{ up.display.title }}</span>
          <span class="desc">{{ up.display.description }}</span>
          <span class="owned">
            Level {{ format(up.amount.value) }} / {{ format(toValue(up.limit) as DecimalSource) }}
          </span>
        </div>
        <button
          class="btn-sm"
          :disabled="!up.canPurchase.value"
          @click="buy(up)"
        >
          <template v-if="up.maxed.value">
            Maxed
          </template>
          <template v-else>
            Buy ({{ format(up.getCost()) }} 🍪)
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

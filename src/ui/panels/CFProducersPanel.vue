<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CookieFactoryKey } from '@/modules/mods/cookie-factory';

const cf = useModule(CookieFactoryKey);

const entries = computed(() => cf.producers.getAll());

function buy(id: string) {
  const entry = cf.producers.getEntry(id);
  const repeatable = entry?.producer.repeatable;
  if (repeatable && repeatable.canPurchase.value) {
    repeatable.purchase();
  }
}
</script>

<template>
  <section class="producers-panel">
    <h3>Producers</h3>
    <div class="producer-list">
      <div
        v-for="entry in entries"
        :key="entry.def.id"
        class="producer-card"
      >
        <div class="info">
          <span class="name">{{ entry.def.name }}</span>
          <span class="desc">{{ entry.def.description }}</span>
          <span class="rate">
            {{ format(Decimal.mul(entry.producer.computedRate.value, entry.producer.count.value)) }}/s
          </span>
          <span class="count">
            Owned: {{ format(Decimal.floor(entry.producer.count.value)) }}
          </span>
        </div>
        <button
          v-if="entry.producer.repeatable"
          v-hold-repeat="() => buy(entry.def.id)"
          class="btn-sm"
          :disabled="!entry.producer.repeatable.canPurchase.value"
        >
          Buy
          <span class="cost">
            ({{ format(entry.producer.repeatable.getCost()) }} 🍪)
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.producers-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.producer-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.producer-card {
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
.rate,
.count {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.cost {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
</style>

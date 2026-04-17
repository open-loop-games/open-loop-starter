<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { MerchantKey } from '@/modules/mods/merchant';
import { GatheringKey } from '@/modules/village-gatherer/gathering';

const mstate = useModule(MerchantKey);
const g = useModule(GatheringKey);

const used = computed(() => {
  let total = new Decimal(0);
  for (const id of mstate.inventory.items()) {
    total = Decimal.add(total, mstate.inventory.get(id));
  }
  return total;
});

const capacity = computed(() => mstate.inventory.capacity.value);
const gold = computed(() => format(Decimal.floor(g.resources.gold.value)));
</script>

<template>
  <section class="ledger-panel">
    <header class="ledger-header">
      <h3>Merchant's Ledger</h3>
      <div class="stats">
        <span>Gold: <strong>{{ gold }}</strong></span>
        <span>Bag: <strong>{{ format(used) }}/{{ format(capacity) }}</strong></span>
      </div>
    </header>
    <table class="trinket-table">
      <thead>
        <tr>
          <th>Trinket</th>
          <th>Owned</th>
          <th>Buy</th>
          <th>Sell</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="t in mstate.trinkets"
          :key="t.id"
        >
          <td>{{ t.name }}</td>
          <td>{{ format(mstate.inventory.get(t.id)) }}</td>
          <td>{{ t.buyPrice }}g</td>
          <td>{{ t.sellPrice }}g</td>
          <td class="actions">
            <button
              class="btn-sm"
              @click="mstate.buy(t.id)"
            >
              Buy
            </button>
            <button
              class="btn-sm"
              @click="mstate.sell(t.id)"
            >
              Sell
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.ledger-panel {
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.ledger-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--gap);
}
.ledger-header h3 {
  font-size: 1em;
}
.stats {
  display: flex;
  gap: var(--gap);
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.trinket-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}
.trinket-table th,
.trinket-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.trinket-table th {
  font-size: 0.75em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}
.actions {
  display: flex;
  gap: 4px;
}
</style>

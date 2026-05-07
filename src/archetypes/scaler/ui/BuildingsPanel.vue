<script setup lang="ts">
import { getCoinProducers, getAccelerator, getMultiplier } from '../modules';
import ProducerRow from './ProducerRow.vue';
import CumulativeRow from './CumulativeRow.vue';

const producers = getCoinProducers();
const accelerator = getAccelerator();
const multiplier = getMultiplier();
</script>

<template>
  <div class="buildings-panel">
    <section class="buildings-panel__section">
      <h3>Producers</h3>
      <div class="buildings-panel__rows">
        <ProducerRow
          v-for="entry in producers.getAll()"
          :key="entry.def.id"
          :producer="entry.producer"
          :name="entry.def.name"
        />
      </div>
    </section>

    <section class="buildings-panel__section">
      <h3>Cumulative-buy</h3>
      <div class="buildings-panel__rows">
        <CumulativeRow
          :purchasable="accelerator"
          name="Accelerator"
          description="Boost rate of all coin producers."
        />
        <CumulativeRow
          :purchasable="multiplier"
          name="Multiplier"
          description="Multiply all coin production."
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.buildings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.buildings-panel__section {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.buildings-panel__section h3 {
  margin: 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.buildings-panel__rows {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import { getCoinProducers, getAccelerator, getMultiplier, getDiamondProducers } from '../modules';
import ProducerRow from './ProducerRow.vue';
import CumulativeRow from './CumulativeRow.vue';

const coinProducers = getCoinProducers();
const diamondProducers = getDiamondProducers();
const accelerator = getAccelerator();
const multiplier = getMultiplier();

const activeTier = ref<string>('coin');
</script>

<template>
  <div class="buildings-panel">
    <TabsRoot
      v-model="activeTier"
      class="buildings-panel__tabs"
    >
      <TabsList class="buildings-panel__tab-list">
        <TabsTrigger
          value="coin"
          class="buildings-panel__tab-trigger"
        >
          Coin
        </TabsTrigger>
        <TabsTrigger
          value="diamond"
          class="buildings-panel__tab-trigger"
        >
          Diamond
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="coin"
        class="buildings-panel__tab-content"
      >
        <section class="buildings-panel__section">
          <h3>Producers</h3>
          <div class="buildings-panel__rows">
            <ProducerRow
              v-for="entry in coinProducers.getAll()"
              :key="entry.def.id"
              :producer="entry.producer"
              :name="entry.def.name"
              cost-label="coins"
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
              cost-label="coins"
            />
            <CumulativeRow
              :purchasable="multiplier"
              name="Multiplier"
              description="Multiply all coin production."
              cost-label="coins"
            />
          </div>
        </section>
      </TabsContent>

      <TabsContent
        value="diamond"
        class="buildings-panel__tab-content"
      >
        <section class="buildings-panel__section">
          <h3>Diamond Producers</h3>
          <p class="buildings-panel__hint">
            Diamond 1 emits prestige shards each tick; Diamond 2-5 cascade into lower tiers.
          </p>
          <div class="buildings-panel__rows">
            <ProducerRow
              v-for="entry in diamondProducers.getAll()"
              :key="entry.def.id"
              :producer="entry.producer"
              :name="entry.def.name"
              cost-label="prestige points"
            />
          </div>
        </section>
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style scoped>
.buildings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.buildings-panel__tabs {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.buildings-panel__tab-list {
  display: flex;
  gap: var(--gap-sm);
}
.buildings-panel__tab-trigger {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-xs) var(--gap-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85em;
}
.buildings-panel__tab-trigger[data-state='active'] {
  background: var(--color-accent, var(--color-surface));
  color: var(--color-text);
  border-color: var(--color-accent, var(--color-border));
}
.buildings-panel__tab-content {
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
.buildings-panel__hint {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.buildings-panel__rows {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>

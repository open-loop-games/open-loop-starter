<script setup lang="ts">
import { useUpgrades } from '../../composables/useUpgrades';
import { useProducerData } from '../../composables/useProducerData';
import { useFormatting } from '@/composables/useFormatting';

const data = useProducerData();
const groups = useUpgrades();
const { format } = useFormatting();

const continuousProducers = data.producers.filter((p) => p.trigger === 'continuous');
</script>

<template>
  <div class="upgrade-tray">
    <section
      v-if="groups.click.length > 0"
      class="upgrade-section"
    >
      <h3 class="panel-title">
        Click
      </h3>
      <ul class="upgrade-list">
        <li
          v-for="row in groups.click"
          :key="row.def.id"
          class="upgrade-row"
          :data-testid="`upgrade-${row.def.id}`"
        >
          <div class="upgrade-name">
            {{ row.def.name }}
          </div>
          <div class="upgrade-desc">
            {{ row.def.description }}
          </div>
          <button
            class="buy-button"
            :disabled="row.bought.value || !row.canPurchase.value"
            @click="row.purchase()"
          >
            {{ row.bought.value ? 'Owned' : `Buy · ${format(row.def.cost, 0)}` }}
          </button>
        </li>
      </ul>
    </section>

    <section
      v-if="groups.global.length > 0"
      class="upgrade-section"
    >
      <h3 class="panel-title">
        Global
      </h3>
      <ul class="upgrade-list">
        <li
          v-for="row in groups.global"
          :key="row.def.id"
          class="upgrade-row"
          :data-testid="`upgrade-${row.def.id}`"
        >
          <div class="upgrade-name">
            {{ row.def.name }}
          </div>
          <div class="upgrade-desc">
            {{ row.def.description }}
          </div>
          <button
            class="buy-button"
            :disabled="row.bought.value || !row.canPurchase.value"
            @click="row.purchase()"
          >
            {{ row.bought.value ? 'Owned' : `Buy · ${format(row.def.cost, 0)}` }}
          </button>
        </li>
      </ul>
    </section>

    <section
      v-for="producer in continuousProducers"
      :key="producer.id"
      class="upgrade-section"
    >
      <h3 class="panel-title">
        {{ producer.name }}
      </h3>
      <ul class="upgrade-list">
        <li
          v-for="row in groups.perProducer.get(producer.id) ?? []"
          :key="row.def.id"
          class="upgrade-row"
          :data-testid="`upgrade-${row.def.id}`"
        >
          <div class="upgrade-name">
            {{ row.def.name }}
          </div>
          <button
            class="buy-button"
            :disabled="row.bought.value || !row.canPurchase.value"
            @click="row.purchase()"
          >
            {{ row.bought.value ? 'Owned' : `Buy · ${format(row.def.cost, 0)}` }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.upgrade-tray {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--gap-sm);
}

.upgrade-section {
  display: flex;
  flex-direction: column;
}

.upgrade-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.upgrade-row {
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upgrade-name {
  font-weight: 600;
  font-size: 0.9em;
}

.upgrade-desc {
  font-size: 0.78em;
  color: var(--color-text-muted);
}

.buy-button {
  width: 100%;
  font-size: 0.8em;
}
</style>

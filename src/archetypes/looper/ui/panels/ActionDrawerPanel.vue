<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useZones } from '../../composables/useZones';
import { useActions } from '../../composables/useActions';
import { useQueue } from '../../composables/useQueue';

const zones = useZones();
const actions = useActions();
const queue = useQueue();
const { format } = useFormatting();

const tabItems = computed<TabItem[]>(() =>
  zones.rows.value.map((row) => ({
    value: row.def.id,
    label: row.def.name,
    disabled: !row.unlocked.value,
  })),
);

// Default selection: highest unlocked zone (so the player sees newest content).
const activeTab = ref(zones.highestUnlocked.value?.id ?? zones.rows.value[0]?.def.id ?? '');

// When new zones unlock, switch the picker focus to the new one.
watch(
  () => zones.highestUnlocked.value?.id,
  (id) => {
    if (id && id !== activeTab.value) activeTab.value = id;
  },
);

function enqueue(actionId: string): void {
  queue.enqueue(actionId, 1);
}
</script>

<template>
  <section
    class="action-drawer"
    data-testid="action-drawer"
  >
    <header class="action-drawer__header">
      <h3>Actions</h3>
      <span class="action-drawer__hint">click to queue</span>
    </header>

    <Tabs
      v-if="tabItems.length > 0"
      v-model="activeTab"
      :items="tabItems"
    >
      <template
        v-for="row in zones.rows.value"
        :key="row.def.id"
        #[`panel-${row.def.id}`]
      >
        <ul class="action-list">
          <li
            v-for="actionRow in actions.rowsByZone(row.def.id).value"
            :key="actionRow.def.id"
            class="action-list__item"
          >
            <button
              class="action-button"
              :data-testid="`enqueue-${actionRow.def.id}`"
              :disabled="!row.unlocked.value"
              @click="enqueue(actionRow.def.id)"
            >
              <span class="action-button__name">{{ actionRow.def.name }}</span>
              <span class="action-button__cost">{{ format(actionRow.effectiveCost.value, 0) }}s</span>
            </button>
            <p class="action-list__desc">
              {{ actionRow.def.description }}
            </p>
            <p
              v-if="actionRow.timesCompleted.value > 0"
              class="action-list__count"
            >
              completed × {{ actionRow.timesCompleted.value }}
            </p>
          </li>
        </ul>
      </template>
    </Tabs>
  </section>
</template>

<style scoped>
.action-drawer {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}

.action-drawer__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.action-drawer__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.action-drawer__hint {
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
}

.action-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.action-list__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.action-button {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}

.action-button:hover:not(:disabled) {
  color: var(--color-primary);
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.action-button__name {
  font-weight: 600;
}

.action-button__cost {
  font-size: 0.8em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.action-list__desc {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
  margin: 0;
}

.action-list__count {
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
  margin: 0;
  font-style: italic;
}
</style>

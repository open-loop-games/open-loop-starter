<script setup lang="ts">
import { computed } from 'vue';
import { useUpgrades, type UpgradeRow } from '../../composables/useUpgrades';
import { useProducerData } from '../../composables/useProducerData';
import { useFormatting } from '@/composables/useFormatting';

const data = useProducerData();
const groups = useUpgrades();
const { format } = useFormatting();

const continuousProducers = data.producers.filter((p) => p.trigger === 'continuous');

interface Section {
  key: string;
  title: string;
  rows: UpgradeRow[];
}

const view = computed<{ sections: Section[]; owned: UpgradeRow[] }>(() => {
  const sections: Section[] = [];
  const owned: UpgradeRow[] = [];

  const push = (key: string, title: string, rows: UpgradeRow[]): void => {
    const avail: UpgradeRow[] = [];
    for (const r of rows) {
      if (r.bought.value) owned.push(r);
      else avail.push(r);
    }
    if (avail.length) sections.push({ key, title, rows: avail });
  };

  if (groups.value.click.length) push('click', 'Click', groups.value.click);
  if (groups.value.global.length) push('global', 'Global', groups.value.global);
  for (const p of continuousProducers) {
    const rows = groups.value.perProducer.get(p.id) ?? [];
    if (rows.length) push(p.id, p.name, rows);
  }

  return { sections, owned };
});
</script>

<template>
  <div class="upgrade-tray">
    <section
      v-for="section in view.sections"
      :key="section.key"
      class="upgrade-section"
    >
      <h3 class="panel-title">
        {{ section.title }}
      </h3>
      <ul class="upgrade-list">
        <li
          v-for="row in section.rows"
          :key="row.def.id"
        >
          <Tooltip>
            <button
              class="upgrade-row"
              :class="{ 'is-affordable': row.canPurchase.value }"
              :disabled="!row.canPurchase.value"
              :data-testid="`upgrade-${row.def.id}`"
              @click="row.purchase()"
            >
              <span class="upgrade-row__name">{{ row.def.name }}</span>
              <span class="upgrade-row__cost">{{ format(row.def.cost, 0) }}</span>
            </button>
            <template #content>
              <div class="tip-name">
                {{ row.def.name }}
              </div>
              <div class="tip-desc">
                {{ row.def.description }}
              </div>
              <div class="tip-cost">
                Cost: {{ format(row.def.cost, 0) }}
              </div>
            </template>
          </Tooltip>
        </li>
      </ul>
    </section>

    <section
      v-if="view.owned.length"
      class="upgrade-section upgrade-section--owned"
    >
      <h3 class="panel-title">
        Owned · {{ view.owned.length }}
      </h3>
      <ul class="owned-strip">
        <li
          v-for="row in view.owned"
          :key="row.def.id"
          :data-testid="`upgrade-${row.def.id}`"
        >
          <Tooltip>
            <span
              class="owned-pill"
              tabindex="0"
            >
              <span class="owned-pill__check">✓</span>
              <span class="owned-pill__name">{{ row.def.name }}</span>
            </span>
            <template #content>
              <div class="tip-name">
                {{ row.def.name }}
              </div>
              <div class="tip-desc">
                {{ row.def.description }}
              </div>
            </template>
          </Tooltip>
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

.upgrade-section--owned {
  margin-top: var(--gap-sm);
  padding-top: var(--gap-sm);
  border-top: 1px dashed var(--color-border);
}

.owned-strip {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.owned-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-badge);
  border-radius: 999px;
  font-size: 0.72em;
  color: var(--color-text-muted);
  opacity: 0.7;
  cursor: default;
  transition: opacity 120ms;
}

.owned-pill:hover,
.owned-pill:focus-visible {
  opacity: 1;
  outline: none;
}

.owned-pill__check {
  color: var(--color-success);
  font-weight: 700;
}

.upgrade-list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

.upgrade-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 80ms,
    border-color 80ms;
}

.upgrade-row:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border);
}

.upgrade-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.upgrade-row:disabled {
  cursor: default;
  color: var(--color-text-muted);
}

.upgrade-row__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85em;
}

.upgrade-row__cost {
  font-size: 0.8em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.upgrade-row.is-affordable .upgrade-row__cost {
  color: var(--color-success);
  font-weight: 600;
}

.tip-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.tip-desc {
  color: var(--color-text-muted);
}

.tip-cost {
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  font-size: 0.9em;
}
</style>

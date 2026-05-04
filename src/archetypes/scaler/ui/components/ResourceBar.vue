<!--
  Persistent resource strip for the sidebar's `#sidebarResources` slot.
  Bespoke per archetype (Layer-2 widget per widget-vocabulary.md —
  9 distinct shapes across 3 reference games). Forks rename labels and
  re-order tiers as the costume demands.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, formatWhole } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { ScalerTiersKey } from '../../modules';

const tiers = useModule(ScalerTiersKey);

const antimatter = tiers.find((t) => t.id === 'antimatter');
const prestige = tiers.find((t) => t.id === 'prestige');
const transcend = tiers.find((t) => t.id === 'transcend');

const rows = computed(() => [
  {
    label: 'Coins',
    value: antimatter ? formatWhole(antimatter.currency.value) : '0',
    key: 'coins',
  },
  {
    label: 'Prestige Points',
    value: prestige ? format(prestige.currency.value, 2) : '0',
    key: 'pp',
    dim: !hasAny(prestige?.currency.value),
  },
  {
    label: 'Prestige Shards',
    value: prestige?.shards ? format(prestige.shards.value, 2) : '0',
    key: 'ps',
    dim: !hasAny(prestige?.shards?.value),
  },
  {
    label: 'Transcend Points',
    value: transcend ? format(transcend.currency.value, 2) : '0',
    key: 'tp',
    dim: !hasAny(transcend?.currency.value),
  },
  {
    label: 'Transcend Shards',
    value: transcend?.shards ? format(transcend.shards.value, 2) : '0',
    key: 'ts',
    dim: !hasAny(transcend?.shards?.value),
  },
]);

function hasAny(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value !== '0' && value !== '';
  if (value && typeof value === 'object' && 'sign' in (value as Record<string, unknown>)) {
    return ((value as { sign: number }).sign ?? 0) > 0;
  }
  return false;
}
</script>

<template>
  <ul class="scaler-resource-bar">
    <li
      v-for="row in rows"
      :key="row.key"
      class="scaler-resource-bar__row"
      :data-dim="row.dim ? 'true' : 'false'"
    >
      <span class="scaler-resource-bar__label">{{ row.label }}</span>
      <span class="scaler-resource-bar__value">{{ row.value }}</span>
    </li>
  </ul>
</template>

<style scoped>
.scaler-resource-bar {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.scaler-resource-bar__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
.scaler-resource-bar__row[data-dim='true'] {
  opacity: 0.5;
}
.scaler-resource-bar__label {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.scaler-resource-bar__value {
  font-weight: 600;
}
</style>

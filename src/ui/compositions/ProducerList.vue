<!--
  ProducerList — panel-level composition over a list of producer-shaped rows
  (buildings, dimensions, businesses). Engine-bridged: adapts to any module
  exposing the ProducerRowData shape. Slots for content shape, props for
  behavior.

  Costume classes (stable API). A story reskins this from outside via
  `:deep(.producer-list__…)` without forking it (see producer's ProducerPanel).
  These class names are part of the contract — treat renames as breaking:
    .producer-list          root section (+ [data-density])
    .producer-list__header  header slot region
    .producer-list__rows    the <ul>
    .producer-list__row     one <li> (+ [data-locked] while prerequisites are unmet)
    .producer-list__row-unmet  the unmet prerequisites, in place of the button
  (Convention: panel-level compositions expose bare BEM classes; widget-level
  components under src/ui/components expose `olui-` classes. Both are stable.)
-->
<script setup lang="ts" generic="R extends ProducerRowData<unknown>">
import { computed } from 'vue';
import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import Button from '@/ui/components/Button.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import type { ProducerRowData } from './ProducerList';

type BulkModeSource = 'global' | 'none';
type Density = 'row' | 'card';
type Reveal = 'inline' | 'tooltip';

const props = withDefaults(
  defineProps<{
    rows: R[];
    /** Price unit for rows that carry none of their own. */
    costLabel?: string;
    bulkModeSource?: BulkModeSource;
    density?: Density;
    reveal?: Reveal;
    bulkModes?: BulkMode[];
  }>(),
  {
    costLabel: '',
    bulkModeSource: 'global',
    density: 'row',
    reveal: 'inline',
    bulkModes: () => [1, 10, 100, 'max'],
  },
);

defineSlots<{
  header?: () => unknown;
  row?: (props: {
    row: R;
    pendingCount: DecimalSource;
    pendingCost: DecimalSource | undefined;
    purchaseLabel: string;
    purchase: () => void;
  }) => unknown;
}>();

const globalBulk = useBulkMode();

function resolveCount(maxAffordable: DecimalSource | undefined): DecimalSource {
  if (props.bulkModeSource === 'none' || maxAffordable === undefined) return 1;
  return globalBulk.resolveCount(maxAffordable);
}

function unmetOf(row: R): string[] {
  return row.unmet?.value ?? [];
}

const visibleRows = computed(() => props.rows.filter((r) => r.unlocked?.value ?? true));

function rowState(row: R) {
  // Floor at 1. `maxAffordable` is 0 when the player cannot afford a single
  // unit, and quoting `cost(0)` renders the cost as 0 — the row would hide
  // what it costs exactly when the player is saving up for it. One is also the
  // count a click would purchase if it could, so `canPurchase`/`purchase` stay honest: both
  // are asked about the count actually shown.
  const pendingCount = Decimal.max(1, resolveCount(row.maxAffordable?.value));
  const pendingCost = row.cost?.(pendingCount);
  const label = (row.costLabel ?? props.costLabel).trim();
  const price = pendingCost === undefined ? '' : ` — ${format(pendingCost, 0)} ${label}`.trimEnd();
  const purchaseLabel = `Purchase ${formatWhole(pendingCount)}${price}`;
  const canPurchase = row.canPurchase(pendingCount);
  const purchase = () => {
    if (canPurchase) row.purchase(pendingCount);
  };
  return { pendingCount, pendingCost, purchaseLabel, canPurchase, purchase };
}
</script>

<template>
  <section class="producer-list" :data-density="density">
    <header class="producer-list__header">
      <slot name="header">
        <BulkModeSelector v-if="bulkModeSource === 'global'" :modes="bulkModes" />
      </slot>
    </header>
    <ul class="producer-list__rows">
      <li
        v-for="row in visibleRows"
        :key="row.id"
        class="producer-list__row"
        :data-locked="unmetOf(row).length > 0 || undefined"
      >
        <template v-if="$slots.row">
          <slot
            name="row"
            :row="row"
            :pending-count="rowState(row).pendingCount"
            :pending-cost="rowState(row).pendingCost"
            :purchase-label="rowState(row).purchaseLabel"
            :purchase="rowState(row).purchase"
          />
        </template>
        <template v-else>
          <div class="producer-list__row-body">
            <div class="producer-list__row-head">
              <strong class="producer-list__row-name">{{ row.displayName }}</strong>
              <span class="producer-list__row-owned">owned: {{ format(row.count.value, 0) }}</span>
              <span v-if="row.displayRate" class="producer-list__row-rate"
                >+{{ format(row.displayRate.value, 2) }}/s</span
              >
            </div>
            <span v-if="unmetOf(row).length" class="producer-list__row-unmet">
              {{ unmetOf(row).join(' · ') }}
            </span>
            <Tooltip v-else-if="reveal === 'tooltip'">
              <Button
                repeat
                :disabled="!rowState(row).canPurchase"
                :data-testid="`purchase-${row.id}`"
                @click="rowState(row).purchase()"
              >
                {{ rowState(row).purchaseLabel }}
              </Button>
              <template #content>
                {{ row.displayName
                }}<template v-if="row.displayRate">
                  — {{ format(row.displayRate.value, 2) }}/s</template
                >
              </template>
            </Tooltip>
            <Button
              repeat
              v-else
              :disabled="!rowState(row).canPurchase"
              :data-testid="`purchase-${row.id}`"
              @click="rowState(row).purchase()"
            >
              {{ rowState(row).purchaseLabel }}
            </Button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>

<style>
.producer-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.producer-list__header {
  display: flex;
  align-items: center;
  gap: var(--gap);
  justify-content: flex-end;
  min-height: 0;
}
.producer-list__header:empty {
  display: none;
}
.producer-list__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.producer-list[data-density='card'] .producer-list__rows {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap);
}
.producer-list__row-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.producer-list[data-density='card'] .producer-list__row-body {
  flex-direction: column;
  align-items: stretch;
}
.producer-list__row-head {
  display: flex;
  gap: var(--gap);
  align-items: baseline;
  flex-wrap: wrap;
}
.producer-list__row-name {
  min-width: 7em;
}
.producer-list__row-owned,
.producer-list__row-rate {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.producer-list__row-unmet {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
</style>

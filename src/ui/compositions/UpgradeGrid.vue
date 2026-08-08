<!--
  UpgradeGrid — panel-level composition over a grid of one-time/tiered
  upgrade cells (AD upgrades, Cookie tray, Synergism cubes). Engine-bridged
  via UpgradeCellData. Reveal mode picks Tooltip / Popover / inline per the
  OL-919 vocabulary; the reveal wrapper sits above the cell so `#cell`
  overrides still receive tooltip/popover wrapping. Use `#reveal-content`
  to customise the tooltip/popover body.

  Costume hooks (stable API) — reskin via `:deep(.upgrade-grid__…)`.
  Renames are breaking:
    .upgrade-grid            root grid (+ inline grid-template-columns)
    .upgrade-grid__cell-wrap the reveal wrapper around each cell
    .upgrade-grid__cell      one cell
  (Panel compositions expose bare BEM hooks; widgets under src/ui/components
  expose `olui-` hooks. Both stable.)
-->
<script setup lang="ts" generic="T = never">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import Popover from '@/ui/components/Popover.vue';
import type { UpgradeCellData } from './UpgradeGrid';

type Reveal = 'inline' | 'tooltip' | 'popover';
type PurchasedState = 'greyed' | 'removed' | 'checkmark';

const props = withDefaults(
  defineProps<{
    cells: UpgradeCellData<T>[];
    columns?: number;
    reveal?: Reveal;
    purchasedState?: PurchasedState;
    showFormula?: boolean;
  }>(),
  {
    columns: 5,
    reveal: 'tooltip',
    purchasedState: 'greyed',
    showFormula: false,
  },
);

defineSlots<{
  cell?: (props: { cell: UpgradeCellData<T>; idx: number }) => unknown;
  'reveal-content'?: (props: { cell: UpgradeCellData<T> }) => unknown;
}>();

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
}));

const visibleCells = computed(() =>
  props.cells.filter((c) => !(c.owned.value && props.purchasedState === 'removed')),
);

function describe(cell: UpgradeCellData<T>): string {
  return typeof cell.description === 'function' ? cell.description() : cell.description;
}
</script>

<template>
  <div class="upgrade-grid" :style="gridStyle">
    <div
      v-for="(cell, idx) in visibleCells"
      :key="cell.id"
      class="upgrade-grid__cell-wrap"
      :style="cell.position !== undefined ? { order: cell.position } : undefined"
    >
      <Tooltip v-if="reveal === 'tooltip'">
        <slot v-if="$slots.cell" name="cell" :cell="cell" :idx="idx" />
        <div v-else class="upgrade-grid__cell" :data-bought="cell.owned.value">
          <div class="upgrade-grid__cell-head">
            <span class="upgrade-grid__cell-pos">#{{ cell.position ?? idx + 1 }}</span>
            <strong>{{ cell.name }}</strong>
          </div>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="cell.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Bought</span
            >
            <span v-else-if="cell.owned.value" class="upgrade-grid__bought">Bought</span>
            <Button
              v-else
              :disabled="!cell.canBuy.value"
              :data-testid="`buy-${cell.id}`"
              @click="cell.buy()"
            >
              {{ format(cell.cost.value, 0) }} {{ cell.costLabel }}
            </Button>
          </div>
        </div>
        <template #content>
          <slot v-if="$slots['reveal-content']" name="reveal-content" :cell="cell" />
          <template v-else>
            <p class="upgrade-grid__cell-desc">
              {{ describe(cell) }}
            </p>
            <p v-if="showFormula && cell.formula" class="upgrade-grid__cell-formula">
              {{ cell.formula() }}
            </p>
          </template>
        </template>
      </Tooltip>
      <Popover v-else-if="reveal === 'popover'">
        <template #trigger>
          <slot v-if="$slots.cell" name="cell" :cell="cell" :idx="idx" />
          <div v-else class="upgrade-grid__cell" :data-bought="cell.owned.value">
            <div class="upgrade-grid__cell-head">
              <span class="upgrade-grid__cell-pos">#{{ cell.position ?? idx + 1 }}</span>
              <strong>{{ cell.name }}</strong>
            </div>
          </div>
        </template>
        <slot v-if="$slots['reveal-content']" name="reveal-content" :cell="cell" />
        <template v-else>
          <p class="upgrade-grid__cell-desc">
            {{ describe(cell) }}
          </p>
          <p v-if="showFormula && cell.formula" class="upgrade-grid__cell-formula">
            {{ cell.formula() }}
          </p>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="cell.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Bought</span
            >
            <span v-else-if="cell.owned.value" class="upgrade-grid__bought">Bought</span>
            <Button
              v-else
              :disabled="!cell.canBuy.value"
              :data-testid="`buy-${cell.id}`"
              @click="cell.buy()"
            >
              {{ format(cell.cost.value, 0) }} {{ cell.costLabel }}
            </Button>
          </div>
        </template>
      </Popover>
      <template v-else>
        <slot v-if="$slots.cell" name="cell" :cell="cell" :idx="idx" />
        <div v-else class="upgrade-grid__cell" :data-bought="cell.owned.value">
          <div class="upgrade-grid__cell-head">
            <span class="upgrade-grid__cell-pos">#{{ cell.position ?? idx + 1 }}</span>
            <strong>{{ cell.name }}</strong>
          </div>
          <p class="upgrade-grid__cell-desc">
            {{ describe(cell) }}
          </p>
          <p v-if="showFormula && cell.formula" class="upgrade-grid__cell-formula">
            {{ cell.formula() }}
          </p>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="cell.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Bought</span
            >
            <span v-else-if="cell.owned.value" class="upgrade-grid__bought">Bought</span>
            <Button
              v-else
              :disabled="!cell.canBuy.value"
              :data-testid="`buy-${cell.id}`"
              @click="cell.buy()"
            >
              {{ format(cell.cost.value, 0) }} {{ cell.costLabel }}
            </Button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.upgrade-grid {
  display: grid;
  gap: var(--gap-sm);
}
.upgrade-grid__cell {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.upgrade-grid__cell[data-bought='true'] {
  background: var(--color-bg);
  opacity: 0.85;
  border-color: var(--color-accent, var(--color-border));
}
.upgrade-grid__cell-head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-xs);
}
.upgrade-grid__cell-pos {
  font-size: 0.7em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.upgrade-grid__cell-desc {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.upgrade-grid__cell-formula {
  margin: 0;
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.upgrade-grid__bought {
  font-weight: 600;
  font-size: 0.85em;
  color: var(--color-accent, var(--color-text));
}
</style>

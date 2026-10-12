<!--
  ChainBreakdown — Paradox-style modifier breakdown table. Feeds off any
  `Modifier` with a description (including `ModifierChain`) plus a base
  value, and renders the per-modifier contribution list.

  Rows come from the engine's `description`, which already filters out
  modifiers whose `enabled` is false — and `ModifierChain.bind()` folds a
  binding's `active` predicate into that same `enabled`, so inactive
  bindings are excluded too. To show inactive factors (greyed out rather
  than absent), walk `chain.bindings()` instead; `description` cannot
  express them.

  Designed to drop inside a `RichTooltip`'s #content slot. Stays
  presentational: no engine writes, no refs beyond the computed breakdown.
-->
<script setup lang="ts">
import { computed } from 'vue';
import {
  Decimal,
  formatSmall,
  resolveComputable,
  type DecimalSource,
  type Modifier,
  type ModifierDescription,
} from '@open-loop/engine';

const props = withDefaults(
  defineProps<{
    title: string;
    modifier: Modifier;
    base?: DecimalSource;
    baseText?: string;
    unit?: string;
    smallerIsBetter?: boolean;
  }>(),
  { base: 1, baseText: 'Base', smallerIsBetter: false },
);

// A sequential modifier's `description` getter flat-maps to an array, while a
// lone modifier resolves to a single row; normalise both to a list.
const rows = computed<ModifierDescription[]>(() => {
  const desc = props.modifier.description;
  if (!desc) return [];
  const resolved = resolveComputable(desc);
  return Array.isArray(resolved) ? resolved : [resolved];
});

const total = computed<DecimalSource>(() => props.modifier.apply(props.base));

const baseValue = computed(() => formatSmall(props.base) + (props.unit ?? ''));
const totalValue = computed(() => formatSmall(total.value) + (props.unit ?? ''));
const totalIsBad = computed(() =>
  props.smallerIsBetter ? Decimal.gt(total.value, props.base) : Decimal.lt(total.value, props.base),
);
</script>

<template>
  <div class="olui-chain-breakdown">
    <div class="olui-chain-breakdown__title">
      {{ title }}
    </div>

    <div class="olui-chain-breakdown__row olui-chain-breakdown__row--base">
      <span class="olui-chain-breakdown__label">{{ baseText }}</span>
      <span class="olui-chain-breakdown__value">{{ baseValue }}</span>
    </div>

    <div
      v-for="(mod, idx) in rows"
      :key="idx"
      class="olui-chain-breakdown__row"
      :class="{ 'olui-chain-breakdown__row--bad': mod.isBad }"
    >
      <span class="olui-chain-breakdown__label">{{ mod.text }}</span>
      <span class="olui-chain-breakdown__value">{{ mod.formattedValue }}</span>
    </div>

    <div
      v-if="rows.length === 0"
      class="olui-chain-breakdown__row olui-chain-breakdown__row--muted"
    >
      <span class="olui-chain-breakdown__label">No active modifiers</span>
    </div>

    <div
      class="olui-chain-breakdown__row olui-chain-breakdown__row--total"
      :class="{ 'olui-chain-breakdown__row--bad': totalIsBad }"
    >
      <span class="olui-chain-breakdown__label">Total</span>
      <span class="olui-chain-breakdown__value">{{ totalValue }}</span>
    </div>
  </div>
</template>

<style>
.olui-chain-breakdown {
  --chain-breakdown-gap: 2px;
  --chain-breakdown-separator: var(--color-border);
  --chain-breakdown-good: var(--color-accent, #7fd67f);
  --chain-breakdown-bad: var(--color-danger, #d67f7f);
  --chain-breakdown-muted: var(--color-text-muted);

  display: flex;
  flex-direction: column;
  gap: var(--chain-breakdown-gap);
  min-width: 240px;
}

.olui-chain-breakdown__title {
  font-weight: 600;
  font-size: 0.95em;
  padding-bottom: 4px;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--chain-breakdown-separator);
}

.olui-chain-breakdown__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap);
  font-size: 0.9em;
}

.olui-chain-breakdown__row--base,
.olui-chain-breakdown__row--muted {
  color: var(--chain-breakdown-muted);
}

.olui-chain-breakdown__row--total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--chain-breakdown-separator);
  font-weight: 600;
}

.olui-chain-breakdown__row--bad .olui-chain-breakdown__value {
  color: var(--chain-breakdown-bad);
}

.olui-chain-breakdown__row:not(.olui-chain-breakdown__row--base):not(
    .olui-chain-breakdown__row--bad
  ):not(.olui-chain-breakdown__row--muted)
  .olui-chain-breakdown__value {
  color: var(--chain-breakdown-good);
}

.olui-chain-breakdown__value {
  font-variant-numeric: tabular-nums;
}
</style>

<!--
  ChainBreakdown — Paradox-style modifier breakdown table. Feeds off any
  `Modifier` with a description (including `ModifierChain`) plus a base
  value, and renders the per-modifier contribution list the engine's
  `createModifierSection` already computes for us.

  Designed to drop inside a `RichTooltip`'s #content slot. Stays
  presentational: no engine writes, no refs beyond the computed breakdown.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { DecimalSource, Modifier } from '@open-loop/engine';
import { createModifierSection } from '../../lib/ui/modifier-section';

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

const section = computed(() =>
  createModifierSection({
    title: props.title,
    modifier: props.modifier,
    base: props.base,
    baseText: props.baseText,
    unit: props.unit,
    smallerIsBetter: props.smallerIsBetter,
  })(),
);
</script>

<template>
  <div class="olui-chain-breakdown">
    <div class="olui-chain-breakdown__title">
      {{ section.title }}
    </div>

    <div class="olui-chain-breakdown__row olui-chain-breakdown__row--base">
      <span class="olui-chain-breakdown__label">{{ section.base.text }}</span>
      <span class="olui-chain-breakdown__value">{{ section.base.value }}</span>
    </div>

    <div
      v-for="(mod, idx) in section.modifiers"
      :key="idx"
      class="olui-chain-breakdown__row"
      :class="{ 'olui-chain-breakdown__row--bad': mod.isBad }"
    >
      <span class="olui-chain-breakdown__label">{{ mod.text }}</span>
      <span class="olui-chain-breakdown__value">{{ mod.formattedValue }}</span>
    </div>

    <div
      v-if="section.modifiers.length === 0"
      class="olui-chain-breakdown__row olui-chain-breakdown__row--muted"
    >
      <span class="olui-chain-breakdown__label">No active modifiers</span>
    </div>

    <div
      class="olui-chain-breakdown__row olui-chain-breakdown__row--total"
      :class="{ 'olui-chain-breakdown__row--bad': section.total.isBad }"
    >
      <span class="olui-chain-breakdown__label">Total</span>
      <span class="olui-chain-breakdown__value">{{ section.total.value }}</span>
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

<!--
  BulkModeSelector — segmented control over a list of bulk modes
  ([1, 10, 100, 'max'] by default). Writes through `useBulkMode()` so the
  choice persists and every purchase panel in the app reads the same mode.

  Sits next to the purchase buttons, never in Settings — genre convention.
  reka-ui's ToggleGroup owns roving-tabindex, aria, and keyboard nav; we
  layer costume classes + a deselect guard (one item is always selected).
-->
<script setup lang="ts">
import { computed } from 'vue';
import { ToggleGroupRoot, ToggleGroupItem } from 'reka-ui';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';

const props = defineProps<{
  modes: BulkMode[];
}>();

const { mode, setMode } = useBulkMode();

const serialized = computed(() => props.modes.map(toKey));

const model = computed<string>({
  get: () => toKey(mode.value),
  set: (next) => {
    if (!next) return;
    setMode(fromKey(next));
  },
});

function toKey(v: BulkMode): string {
  return v === 'max' ? 'max' : String(v);
}

function fromKey(k: string): BulkMode {
  if (k === 'max') return 'max';
  const n = Number.parseInt(k, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function labelFor(k: string): string {
  return k === 'max' ? 'Max' : `×${k}`;
}
</script>

<template>
  <ToggleGroupRoot
    v-model="model"
    type="single"
    :roving-focus="true"
    class="olui-bulk-mode"
    aria-label="Bulk purchase count"
  >
    <ToggleGroupItem
      v-for="key in serialized"
      :key="key"
      :value="key"
      class="olui-bulk-mode__item"
      :data-testid="`bulk-mode-${key}`"
    >
      {{ labelFor(key) }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style>
.olui-bulk-mode {
  --bulk-mode-bg: var(--color-bg);
  --bulk-mode-border: var(--color-border);
  --bulk-mode-item-color: var(--color-text-muted);
  --bulk-mode-item-color-active: var(--color-text);
  --bulk-mode-item-bg-active: var(--color-surface);
  --bulk-mode-item-border-active: var(--color-primary);
  --bulk-mode-radius: var(--radius-sm);

  display: inline-flex;
  border: 1px solid var(--bulk-mode-border);
  border-radius: var(--bulk-mode-radius);
  background: var(--bulk-mode-bg);
  overflow: hidden;
}

.olui-bulk-mode__item {
  flex: 1 0 auto;
  padding: 4px 10px;
  font-size: 0.8em;
  font-weight: 500;
  color: var(--bulk-mode-item-color);
  background: transparent;
  border: none;
  cursor: pointer;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  transition:
    color 0.1s,
    background 0.1s;
}

.olui-bulk-mode__item + .olui-bulk-mode__item {
  border-left: 1px solid var(--bulk-mode-border);
}

.olui-bulk-mode__item:hover:not([data-disabled]) {
  color: var(--bulk-mode-item-color-active);
}

.olui-bulk-mode__item[data-state='on'] {
  color: var(--bulk-mode-item-color-active);
  background: var(--bulk-mode-item-bg-active);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--bulk-mode-item-border-active);
}

.olui-bulk-mode__item:focus-visible {
  outline: 2px solid var(--bulk-mode-item-border-active);
  outline-offset: -2px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import type { AutomationItemRow } from '../composables/useAutomationPanel';

const props = defineProps<{ row: AutomationItemRow }>();

const enabled = computed<boolean>({
  get: () => props.row.enabled.value,
  set: (v) => props.row.setEnabled(v),
});
// Max sentinel 9999 = "unlimited"; surface it as an empty field with an ∞
// placeholder so the player sees a cap only when they set one.
const maxDisplay = computed<number | null>({
  get: () => (props.row.max && props.row.max.value >= 9999 ? null : (props.row.max?.value ?? null)),
  set: (v) => props.row.setMax?.(v == null || Number.isNaN(v) ? 9999 : v),
});
const triggerPercent = computed<number>({
  get: () => Math.round((props.row.trigger?.value ?? 0) * 100),
  set: (pct) => props.row.setTrigger?.(pct / 100),
});
</script>

<template>
  <li
    class="auto-row"
    :class="{ 'auto-row--off': !row.enabled.value }"
    :data-testid="`auto-${row.id}`"
  >
    <SwitchRoot
      v-model="enabled"
      class="olui-switch auto-row__switch"
      :aria-label="`Automate ${row.name}`"
      :data-testid="`auto-${row.id}-enabled`"
    >
      <SwitchThumb class="olui-switch__thumb" />
    </SwitchRoot>
    <span class="auto-row__name">{{ row.name }}</span>

    <label
      v-if="row.trigger"
      class="auto-row__field"
      :title="`Only spend when inputs are at least ${triggerPercent}% full`"
    >
      <span class="auto-row__field-label">trigger</span>
      <input
        v-model.number="triggerPercent"
        type="range"
        min="0"
        max="100"
        step="5"
        :disabled="!row.enabled.value"
        :aria-label="`${row.name} trigger`"
        :data-testid="`auto-${row.id}-trigger`"
      >
      <span class="auto-row__field-value">{{ triggerPercent }}%</span>
    </label>

    <label
      v-if="row.max"
      class="auto-row__field auto-row__field--max"
    >
      <span class="auto-row__field-label">max</span>
      <input
        v-model.number="maxDisplay"
        type="number"
        min="0"
        step="1"
        placeholder="∞"
        :disabled="!row.enabled.value"
        :aria-label="`${row.name} max`"
        :data-testid="`auto-${row.id}-max`"
      >
    </label>
  </li>
</template>

<style scoped>
.auto-row {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-xs) 2px;
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}
.auto-row--off {
  opacity: 0.55;
}
.auto-row__name {
  font-weight: 600;
  flex: 1 1 auto;
  min-width: 0;
}
.auto-row__field {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
  cursor: pointer;
}
.auto-row__field-label {
  font-size: 0.72em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.auto-row__field input[type='range'] {
  width: 84px;
}
.auto-row__field-value {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: 0.82em;
  min-width: 2.6em;
  text-align: right;
}
.auto-row__field--max input[type='number'] {
  width: 60px;
  font-variant-numeric: tabular-nums;
}
</style>

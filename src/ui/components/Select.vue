<!--
  Select — thin reka-ui Select wrapper.

  Behavioral primitives (a11y, focus, portal, positioning) come from reka-ui.
  This component supplies costume classes + default custom-property values so
  theme-widgets.css can style Select without touching scoped CSS.

  Emits `update:modelValue` so it works with `v-model` at the call site. A value is
  a string or a number, typed by the options passed.
-->
<script setup lang="ts" generic="V extends string | number = string">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from 'reka-ui';
import { usePortalTarget } from '@/lib/portal';

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

const portalTarget = usePortalTarget();

const props = defineProps<{
  modelValue: V;
  options: ReadonlyArray<SelectOption<V>>;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: V];
}>();

function onUpdate(next: unknown) {
  if (next !== props.modelValue) emit('update:modelValue', next as V);
}
</script>

<template>
  <SelectRoot :model-value="modelValue" :disabled="disabled" @update:model-value="onUpdate">
    <SelectTrigger class="olui-select__trigger" :aria-label="ariaLabel">
      <SelectValue :placeholder="placeholder ?? 'Select…'" />
      <SelectIcon class="olui-select__icon"> ▾ </SelectIcon>
    </SelectTrigger>
    <SelectPortal :to="portalTarget">
      <SelectContent class="olui-select__content" :side-offset="4" position="popper">
        <SelectViewport class="olui-select__viewport">
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            class="olui-select__item"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            <SelectItemText>{{ opt.label }}</SelectItemText>
            <SelectItemIndicator class="olui-select__indicator"> ✓ </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

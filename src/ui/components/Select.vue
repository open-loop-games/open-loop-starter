<!--
  Select — thin reka-ui Select wrapper.

  Behavioral primitives (a11y, focus, portal, positioning) come from reka-ui.
  This component supplies class hooks + default custom-property values so
  theme-widgets.css can style Select without touching scoped CSS.

  Emits `update:modelValue` so it works with `v-model` at the call site.
-->
<script setup lang="ts">
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

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const props = defineProps<{
  modelValue: string;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function onUpdate(next: string) {
  if (next !== props.modelValue) emit('update:modelValue', next);
}
</script>

<template>
  <SelectRoot
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="onUpdate"
  >
    <SelectTrigger
      class="olui-select__trigger"
      :aria-label="ariaLabel"
    >
      <SelectValue :placeholder="placeholder ?? 'Select…'" />
      <SelectIcon class="olui-select__icon">
        ▾
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="olui-select__content"
        :side-offset="4"
        position="popper"
      >
        <SelectViewport class="olui-select__viewport">
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            class="olui-select__item"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            <SelectItemText>{{ opt.label }}</SelectItemText>
            <SelectItemIndicator class="olui-select__indicator">
              ✓
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

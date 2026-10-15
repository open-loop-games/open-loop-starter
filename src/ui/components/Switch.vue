<!--
  Switch — a two-state control with instant effect, over reka-ui SwitchRoot and
  SwitchThumb. The button holds the track and the label, so the whole control is
  one click target. It never repeats on hold. The default slot is the label,
  after the track; it receives `on`.

  Costume classes (stable API) — renames are breaking:
    .olui-switch          the button (+ [data-state=checked|unchecked], [data-disabled])
    .olui-switch__track   the track; hide it for a text-only toggle
    .olui-switch__thumb   the thumb
    .olui-switch__label   the label slot
-->
<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';

defineProps<{
  disabled?: boolean;
  /** Names the switch for assistive tech when the label slot does not. */
  ariaLabel?: string;
}>();
defineSlots<{ default?: (props: { on: boolean }) => unknown }>();
const on = defineModel<boolean>({ required: true });
</script>

<template>
  <SwitchRoot v-model="on" :disabled="disabled" :aria-label="ariaLabel" class="olui-switch">
    <span class="olui-switch__track" aria-hidden="true">
      <SwitchThumb class="olui-switch__thumb" />
    </span>
    <span v-if="$slots.default" class="olui-switch__label"><slot :on="on" /></span>
  </SwitchRoot>
</template>

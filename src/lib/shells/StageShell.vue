<!--
  StageShell — a stage that fills the viewport, for a map, arena or board the
  game draws on: an RTS, a survivor run, an info bar over a control panel. Bars
  above and below are optional, and #floats anchors a HUD over the stage. It sets
  defaults over BaseShell and owns no CSS; every BaseShell slot and prop applies.

  Content in main fills the stage: give it `flex: 1` or `position: absolute;
  inset: 0`. The stage clips; a screen that scrolls as a page wants ColumnShell.
-->
<script setup lang="ts">
import BaseShell from './BaseShell.vue';
import { BASE_SHELL_DEFAULTS, type BaseShellProps } from './shell-props';

const props = withDefaults(defineProps<BaseShellProps>(), {
  ...BASE_SHELL_DEFAULTS,
  main: 'stage',
  viewport: 'fixed',
  stageBleed: true,
});
</script>

<template>
  <BaseShell v-bind="props">
    <template v-for="(_, name) in $slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BaseShell>
</template>

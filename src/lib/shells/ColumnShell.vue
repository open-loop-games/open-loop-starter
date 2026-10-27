<!--
  ColumnShell — main with a rail on either side or both, under an optional top bar:
  the single column, sidebar + main and three-panel layouts, which differ only in
  which slots a game fills. It sets defaults over BaseShell and owns no CSS; every
  BaseShell slot and prop applies.

  Defaults: rails that hold between their bounds, and a centre minimum, so a
  three-column layout keeps its main readable. For a capped single column, pass
  `max-width`.
-->
<script setup lang="ts">
import BaseShell from './BaseShell.vue';
import { BASE_SHELL_DEFAULTS, type BaseShellProps } from './shell-props';

const props = withDefaults(defineProps<BaseShellProps>(), {
  ...BASE_SHELL_DEFAULTS,
  sideBarLeftWidth: 'minmax(250px, 300px)',
  sideBarRightWidth: 'minmax(280px, 340px)',
  mainMinWidth: '480px',
});
</script>

<template>
  <BaseShell v-bind="props">
    <template v-for="(_, name) in $slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BaseShell>
</template>

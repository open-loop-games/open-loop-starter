<!--
  ThreePanelShell — asymmetric left/main/right layout.
  Covers ~14% of the 42-game layout corpus. Canonical examples: Kittens
  Game, SharkGame, idle-loops family. No game in the corpus uses symmetric
  three-panel, so defaults are asymmetric.

  Shell API conventions — see SingleColumnShell.vue.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    leftWidth?: string;
    rightWidth?: string;
  }>(),
  { leftWidth: '200px', rightWidth: '280px' },
);
</script>

<template>
  <div
    class="olui-three-panel"
    :style="{
      '--three-panel-left-width': leftWidth,
      '--three-panel-right-width': rightWidth,
    }"
  >
    <aside class="olui-three-panel__left">
      <slot name="left" />
    </aside>
    <section class="olui-three-panel__main">
      <slot />
    </section>
    <aside class="olui-three-panel__right">
      <slot name="right" />
    </aside>
  </div>
</template>

<style>
.olui-three-panel {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns:
    var(--three-panel-left-width, 200px)
    1fr
    var(--three-panel-right-width, 280px);
  gap: var(--gap);
  padding: var(--gap);
  min-height: 0;
  width: 100%;
}

.olui-three-panel__left,
.olui-three-panel__main,
.olui-three-panel__right {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap);
  overflow: auto;
  min-height: 0;
}
</style>

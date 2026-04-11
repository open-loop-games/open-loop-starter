<!--
  SingleColumnShell — centered column, max-width clamped, gap padding.
  Covers ~19% of the 42-game layout corpus. Slot-based, pure CSS.

  Shell API conventions (see OL-263, inherited by all sibling shells):
    1. Slot naming: `default` for the obvious "main" region; descriptive
       names (`sidebar`, `left`, `right`) for auxiliary regions.
    2. Width props: `{slotName}Width` as a CSS length string.
    3. No behavior props, no JS, no emitted events. Pure layout.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    maxWidth?: string;
  }>(),
  { maxWidth: '800px' },
);
</script>

<template>
  <div
    class="olui-single-column"
    :style="{ '--single-column-max-width': maxWidth }"
  >
    <div class="olui-single-column__inner">
      <slot />
    </div>
  </div>
</template>

<style>
.olui-single-column {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  padding: var(--gap);
  width: 100%;
}

.olui-single-column__inner {
  width: 100%;
  max-width: var(--single-column-max-width, 800px);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
</style>

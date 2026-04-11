<!--
  MultiColumnShell — parameterized N-column horizontal strip.
  Covers ~7% of the 42-game layout corpus. Canonical examples: Trimps (4),
  arcanum (4), Cavernous II (5). Explicitly NOT a 2×2 grid — horizontal
  strips only. See layout-spray research for the killed 2×2 idea.

  Slot API: named slots `column-0`, `column-1`, ... `column-N`. Named slots
  beat scoped slot props here because consumers reading code immediately
  see which column is which, and templates don't need a v-for.

  Props:
    - columns: number (uniform 1fr columns) | string[] (explicit CSS lengths)

  Shell API conventions — see SingleColumnShell.vue.
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  columns: number | string[];
}>();

const columnKeys = computed(() => {
  const count = typeof props.columns === 'number' ? props.columns : props.columns.length;
  return Array.from({ length: count }, (_, i) => i);
});

const gridTemplate = computed(() => {
  if (typeof props.columns === 'number') {
    return `repeat(${props.columns}, 1fr)`;
  }
  return props.columns.join(' ');
});
</script>

<template>
  <div
    class="olui-multi-column"
    :style="{ '--multi-column-template': gridTemplate }"
  >
    <section
      v-for="i in columnKeys"
      :key="i"
      class="olui-multi-column__col"
      :data-column-index="i"
    >
      <slot :name="`column-${i}`" />
    </section>
  </div>
</template>

<style>
.olui-multi-column {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: var(--multi-column-template);
  gap: var(--gap);
  padding: var(--gap);
  min-height: 0;
  width: 100%;
}

.olui-multi-column__col {
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

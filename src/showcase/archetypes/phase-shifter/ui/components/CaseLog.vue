<!--
  CaseLog — the carbon the whole game is read through, top to bottom, with
  the newest line kept in view.
-->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { getCase } from '../../modules';

const { lines } = getCase();
const el = ref<HTMLElement>();
watch(
  () => lines.value.length,
  () => nextTick(() => el.value?.scrollTo({ top: el.value.scrollHeight })),
  { immediate: true },
);
</script>

<template>
  <section ref="el" class="nc-log" aria-label="Case log">
    <h2 class="nc-label">Carbon &mdash; case log</h2>
    <p v-for="(line, i) in lines" :key="i" :class="{ fresh: i === lines.length - 1 }">
      {{ line }}
    </p>
  </section>
</template>

<style scoped>
.nc-log {
  margin-top: 22px;
  padding: 0 16px 14px;
  background: var(--nc-carbon-paper);
  border-left: 3px solid var(--nc-carbon-faint);
  font-family: var(--nc-face-typed);
  font-size: 14px;
  color: var(--nc-carbon);
  max-height: 360px;
  overflow-y: auto;
}
.nc-log h2 {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 14px 0 8px;
  background: var(--nc-carbon-paper);
  font-family: var(--nc-face-book);
}
.nc-log p {
  margin: 0 0 7px;
}
.nc-log p.fresh {
  color: var(--nc-paper);
  animation: nc-arrive 600ms ease-out both;
}
</style>

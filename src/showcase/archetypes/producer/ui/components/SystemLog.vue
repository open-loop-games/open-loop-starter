<!--
  SystemLog — the accumulating half of the left rail.

  Indexed by fleet size rather than time; the reasoning is in
  `../../composables/useSystemLog.ts`. Newest last, scrolled to the bottom,
  because the log is read as a record rather than a feed.
-->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { format } from '@open-loop/engine';
import type { SystemLogEntry } from '../../composables/useSystemLog';

const props = defineProps<{ entries: SystemLogEntry[] }>();

const scroller = ref<HTMLElement | null>(null);

watch(
  () => props.entries.length,
  async () => {
    await nextTick();
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<template>
  <div ref="scroller" class="log">
    <p v-for="entry in entries" :key="entry.id" class="log__line">
      <span class="log__at">{{ format(entry.at, 0) }}</span>
      <span class="log__msg">{{ entry.message }}</span>
    </p>
  </div>
</template>

<style scoped>
.log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
}
.log__line {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 10.5px;
  line-height: 1.5;
}
.log__at {
  font-variant-numeric: tabular-nums;
  opacity: 0.45;
  flex: 0 0 auto;
  min-width: 3ch;
  text-align: right;
}
.log__msg {
  opacity: 0.85;
}
</style>

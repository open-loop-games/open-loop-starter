<!--
  JournalPanel — the dojo's journal, newest first: inkings, purchases and fumbles, bouts
  won and lost, techniques learned, graduations. A line runs on under its stamp, and its
  tone sets its colour; the newest line is not singled out.
-->
<script setup lang="ts">
import { EventLog } from '@/ui/compositions';
import { getLineage } from '../../modules';
import { fmtClock } from '../format';

const lineage = getLineage();
</script>

<template>
  <section class="if-panel journal" aria-label="Journal">
    <h2 class="if-title">Journal</h2>
    <EventLog :lines="lineage.journal.lines.value" :limit="40" aria-live="polite">
      <template #row="{ line }">
        <span class="at num">{{ fmtClock(line.at) }}</span> {{ line.text }}
      </template>
      <template #empty>The brush is dry; nothing is written yet.</template>
    </EventLog>
  </section>
</template>

<style scoped>
.journal :deep(.event-log) {
  display: block;
  max-height: 260px;
  overflow: auto;
  font-size: 12.5px;
}
.journal :deep(.event-log__row) {
  display: block;
  padding: 1px 0;
  color: var(--if-tatami);
  animation: none;
}
.journal :deep(.event-log__empty) {
  font-style: normal;
  color: var(--if-tatami-dim);
}
.at {
  color: var(--if-tatami-dim);
  margin-right: 4px;
}
.journal :deep(.event-log__row--win),
.journal :deep(.event-log__row--learn),
.journal :deep(.event-log__row--ink) {
  color: var(--if-moonlight);
}
.journal :deep(.event-log__row--win) {
  color: var(--if-lamplight);
}
.journal :deep(.event-log__row--loss),
.journal :deep(.event-log__row--fumble) {
  color: var(--if-vermilion);
}
.journal :deep(.event-log__row--gate),
.journal :deep(.event-log__row--rite) {
  color: var(--if-indigo);
}
</style>

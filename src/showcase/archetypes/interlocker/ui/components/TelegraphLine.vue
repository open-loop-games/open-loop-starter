<!--
  TelegraphLine — the works' wire, newest first: patents in chalk,
  first buildings in line work, Expositions in brass, the Ministry's orders under a brass
  rule, the turn of the seasons in italic, shortfalls in vermilion. Each wire carries the
  play clock it was sent at, and inks in as it arrives.
-->
<script setup lang="ts">
import { EventLog } from '@/ui/compositions';
import { formatClock } from '@/composables/useFormatting';
import { getTelegraph, getWorks } from '../../modules';

const telegraph = getTelegraph();
const works = getWorks();
const sawpit = works.researched('sawpit');
</script>

<template>
  <div class="ae-telegraph" aria-label="Telegraph">
    <h2 class="ae-section-head">Telegraph</h2>
    <EventLog class="wire" :lines="telegraph.log.lines.value" :format-time="formatClock">
      <template #empty>
        The line is quiet.<template v-if="!sawpit">
          Patent the Sawpit Guild to put the compagnons to work.</template
        >
      </template>
    </EventLog>
  </div>
</template>

<style scoped>
.wire {
  font-size: 0.86rem;
  gap: 0;
}
.wire :deep(.event-log__row),
.wire :deep(.event-log__empty) {
  padding: 4px 0;
  border-bottom: 1px dotted var(--ae-cyanotype-wash);
  animation: ae-inked 0.5s ease-out;
}
.wire :deep(.event-log__row) {
  display: grid;
  grid-template-columns: 3.3rem 1fr;
  gap: 6px;
}
.wire :deep(.event-log__time) {
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--ae-drafting-line-faint);
}
.wire :deep(.event-log__text) {
  color: var(--ae-drafting-line);
}
.wire :deep(.event-log__row--research .event-log__text) {
  color: var(--ae-chalk);
}
.wire :deep(.event-log__row--expo .event-log__text) {
  color: var(--ae-brass);
}
.wire :deep(.event-log__row--order .event-log__text) {
  color: var(--ae-chalk);
  padding-left: 6px;
  border-left: 2px solid var(--ae-brass-dim);
}
.wire :deep(.event-log__row--season .event-log__text) {
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
.wire :deep(.event-log__row--warn .event-log__text) {
  color: var(--ae-vermilion);
}
.wire :deep(.event-log__empty) {
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
</style>

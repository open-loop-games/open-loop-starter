<!--
  ScannerPanel — the police scanner: the last few lines of what happened, edged
  by kind. Under it, the Legends: the clippings the city keeps, opened as
  starter's `AchievementGrid` on the frame's modal stack.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import AchievementGrid, { type AchievementCard } from '@/ui/components/AchievementGrid.vue';
import { EventLog } from '@/ui/compositions';
import { getCore, getLegends } from '../../modules';

const core = getCore();
const legends = getLegends();
const stack = inject(modalStackKey)!;

const earned = computed(
  () => legends.legends.getAll().filter((e) => e.achievement.earned.value).length,
);

function openLegends() {
  const cards: AchievementCard[] = legends.legends.getAll().map((e) => ({
    id: e.def.id,
    displayName: e.achievement.earned.value ? e.def.title : '— unwritten —',
    description: e.def.description,
    earned: e.achievement.earned.value,
  }));
  stack.push(AchievementGrid, { class: 'clippings', title: 'Legends', cards });
}
</script>

<template>
  <section class="panel scanner">
    <span class="caption">Police scanner</span>
    <EventLog class="calls" :lines="core.scanner.lines.value" :limit="8">
      <template #empty>Quiet night. Recruit your first patrol.</template>
    </EventLog>
    <Button v-if="earned > 0" class="act ghost legends reveal" @click="openLegends">
      Legends <span class="num">{{ earned }} / {{ legends.legends.getAll().length }}</span>
    </Button>
  </section>
</template>

<style scoped>
.calls {
  display: block;
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.45;
}
/* Edged by kind, never by freshness: the newest call reads like the rest. */
.calls :deep(.event-log__row),
.calls :deep(.event-log__empty) {
  display: list-item;
  border-left: 3px solid var(--newsprint-faint);
  padding-left: 8px;
  margin-bottom: 4px;
  color: var(--newsprint-dim);
  font-style: normal;
  animation: none;
}
.calls :deep(.event-log__row--reboot),
.calls :deep(.event-log__row--upgrade),
.calls :deep(.event-log__row--legend) {
  border-color: var(--signal);
}
.calls :deep(.event-log__row--rewrite) {
  border-color: var(--orbit);
}
.calls :deep(.event-log__row--elseworld-enter),
.calls :deep(.event-log__row--elseworld-complete),
.calls :deep(.event-log__row--elseworld-abandon) {
  border-color: var(--cape);
}
.calls :deep(.event-log__row--automation) {
  border-color: var(--steel);
}
.legends {
  margin-top: 8px;
  width: 100%;
}
</style>

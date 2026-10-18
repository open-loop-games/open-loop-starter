<!--
  FeedPanel — the street feed: what just happened on the map, newest first. Starter's
  EventLog renders it. The match keeps its feed as entries of its own, newest first and
  unnumbered, so this panel numbers each entry once, the first time it sees it, and hands
  the log its lines oldest first.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { EventLog, type EventLine } from '@/ui/compositions';
import { getMatch, type FeedEntry } from '../../modules';
import { clock } from '../format';

const match = getMatch();

// An entry object is never rebuilt, so its number is stable for as long as it is shown.
const numbered = new WeakMap<FeedEntry, number>();
let next = 0;
const seqOf = (f: FeedEntry) => {
  let seq = numbered.get(f);
  if (seq === undefined) numbered.set(f, (seq = ++next));
  return seq;
};

const lines = computed(() =>
  [...match.feed.value].reverse().map((f): EventLine<FeedEntry['tone']> => ({
    seq: seqOf(f),
    at: f.t,
    kind: f.tone,
    text: f.text,
  })),
);
</script>

<template>
  <section class="feedbox" aria-label="Street feed">
    <h2 class="cc-title">Street feed</h2>
    <EventLog class="feed" :lines="lines" :format-time="clock">
      <template #empty>Quiet. Too quiet.</template>
    </EventLog>
  </section>
</template>

<style scoped>
.feedbox {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  background: color-mix(in srgb, var(--cc-asphalt-raised) 60%, transparent);
  scrollbar-width: thin;
  scrollbar-color: var(--cc-rain) transparent;
}
.feed {
  gap: 4px;
  font-size: 12px;
}
.feed :deep(.event-log__row),
.feed :deep(.event-log__empty) {
  display: block;
  color: var(--cc-chalk-dim);
  font-style: normal;
  border-left: 2px solid var(--cc-gutter);
  padding-left: 7px;
}
.feed :deep(.event-log__row--good) {
  border-left-color: var(--cc-sodium);
  color: var(--cc-chalk);
}
.feed :deep(.event-log__row--bad) {
  border-left-color: var(--cc-rival);
  color: var(--cc-chalk);
}
.feed :deep(.event-log__time) {
  font-family: var(--cc-face-neon);
  font-size: 16px;
  color: var(--cc-chalk-faint);
  margin-right: 6px;
}
</style>

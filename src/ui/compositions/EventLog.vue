<!--
  EventLog — panel-level composition over the lines of a `createEventLog` log:
  a list of kinded rows, the newest marked fresh, with an empty state.
  `#row` replaces a row's content and receives `{ line, fresh }`; `#empty` replaces
  the empty state.

  Costume classes (stable API) — reskin via `:deep(.event-log__…)`. Renames are breaking:
    .event-log                the <ol> (+ [data-order])
    .event-log__row           one <li>
    .event-log__row--<kind>   the line's kind
    .event-log__row--fresh    the newest line; it enters with a fade
    .event-log__time          the time column, when `formatTime` is given
    .event-log__text          the line's text
    .event-log__empty         the empty state
-->
<script setup lang="ts" generic="L extends EventLine<string, unknown>">
import { computed } from 'vue';
import type { EventLine, EventLogOrder } from './EventLog';

const props = withDefaults(
  defineProps<{
    lines: readonly L[];
    limit?: number;
    order?: EventLogOrder;
    formatTime?: (at: number) => string;
  }>(),
  { limit: undefined, order: 'newest-first', formatTime: undefined },
);
defineSlots<{
  row?: (props: { line: L; fresh: boolean }) => unknown;
  empty?: () => unknown;
}>();

const shown = computed(() => {
  const kept = props.limit === undefined ? props.lines : props.lines.slice(-props.limit);
  return props.order === 'newest-first' ? [...kept].reverse() : kept;
});
const newest = computed(() => props.lines.at(-1)?.seq);
</script>

<template>
  <ol class="event-log" :data-order="order">
    <li
      v-for="line in shown"
      :key="line.seq"
      :class="[
        'event-log__row',
        `event-log__row--${line.kind}`,
        { 'event-log__row--fresh': line.seq === newest },
      ]"
    >
      <slot name="row" :line="line" :fresh="line.seq === newest">
        <span v-if="formatTime" class="event-log__time">{{ formatTime(line.at) }}</span>
        <span class="event-log__text">{{ line.text }}</span>
      </slot>
    </li>
    <li v-if="shown.length === 0" class="event-log__empty">
      <slot name="empty">Nothing yet.</slot>
    </li>
  </ol>
</template>

<style scoped>
.event-log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-log__row {
  display: flex;
  gap: var(--gap-sm);
  color: var(--color-text-muted);
}

.event-log__row--fresh {
  color: var(--color-text);
  animation: event-log-enter 400ms ease-out both;
}

.event-log__time {
  flex: none;
  font-variant-numeric: tabular-nums;
}

.event-log__empty {
  color: var(--color-text-muted);
  font-style: italic;
}

@keyframes event-log-enter {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-log__row--fresh {
    animation: none;
  }
}
</style>

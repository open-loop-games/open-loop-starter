<!--
  LogPanel — canon's right-rail console. Newest message on top, color-coded by
  tone, with a Clear control. Reads the session-scoped log store; the feed that
  fills it is wired in the in-game shell via useLogFeed.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useGameLog } from '../composables/useGameLog';

const { entries, clear } = useGameLog();
</script>

<template>
  <div class="log-panel">
    <header class="log-panel__head">
      <h3 class="olui-panel__title">Log</h3>
      <Button class="log-panel__clear" data-testid="log-clear" @click="clear()"> Clear </Button>
    </header>
    <ol class="log-panel__list">
      <li v-for="e in entries" :key="e.id" class="log-panel__entry" :data-tone="e.tone">
        {{ e.text }}
      </li>
    </ol>
  </div>
</template>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}
.log-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
}
.log-panel__clear {
  font-size: 0.75em;
  padding: 2px 8px;
}
.log-panel__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  min-height: 0;
  font-size: 0.8rem;
  line-height: 1.35;
}
.log-panel__entry {
  color: var(--color-text-muted);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}
.log-panel__entry[data-tone='good'] {
  color: var(--color-text);
}
.log-panel__entry[data-tone='bad'] {
  color: var(--color-danger);
}
</style>

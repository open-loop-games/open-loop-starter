<!--
  JournalPanel — the dojo's journal, newest first: inkings, purchases and fumbles, bouts
  won and lost, techniques learned, graduations.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getLineage } from '../../modules';
import { fmtClock } from '../format';

const lineage = getLineage();
const lines = computed(() => [...lineage.journal.value].reverse().slice(0, 40));
</script>

<template>
  <section class="if-panel journal" aria-label="Journal">
    <h2 class="if-title">Journal</h2>
    <ol class="lines" aria-live="polite">
      <li v-for="l in lines" :key="l.seq" :class="l.tone">
        <span class="at num">{{ fmtClock(l.at) }}</span> {{ l.text }}
      </li>
    </ol>
  </section>
</template>

<style scoped>
.lines {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow: auto;
  font-size: 12.5px;
  color: var(--if-tatami);
}
.lines li {
  padding: 1px 0;
}
.at {
  color: var(--if-tatami-dim);
  margin-right: 4px;
}
.win,
.learn,
.ink {
  color: var(--if-moonlight);
}
.win {
  color: var(--if-lamplight);
}
.loss,
.fumble {
  color: var(--if-vermilion);
}
.gate,
.rite {
  color: var(--if-indigo);
}
</style>

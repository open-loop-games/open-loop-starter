<script setup lang="ts">
import { computed } from 'vue';
import { getNight } from '../../modules';
import type { NightSummary } from '../../modules';
import { ZONES } from '../../data';
import { clock } from '../format';

const night = getNight();
const nights = computed(() =>
  night.log.history.value
    .map((e) => e.annotations.summary as NightSummary | undefined)
    .filter((s): s is NightSummary => !!s)
    .reverse(),
);
function kept(s: NightSummary): string {
  const total = Object.values(s.mastery).reduce((a, b) => a + b, 0);
  return `+${(total * 100).toFixed(1)}%`;
}
function ending(s: NightSummary): string {
  if (s.escaped) return 'over the wall';
  if (s.cause === 'turned-in') return 'turned in';
  return `caught in ${s.depth === 0 ? 'the cell' : ZONES[s.depth].displayName.replace(/^The /, 'the ')}`;
}
</script>

<template>
  <section v-if="nights.length" class="lo-panel lo-log lo-reveal" aria-label="Night log">
    <h2>Night Log</h2>
    <ol>
      <li v-for="s in nights" :key="s.night" :class="{ out: s.escaped }">
        <span class="lo-num lo-log-n">{{ s.night }}</span>
        <span class="lo-log-end">{{ ending(s) }}</span>
        <span class="lo-num lo-log-t">{{ clock(s.seconds) }}</span>
        <span class="lo-num lo-log-intel">+{{ s.intel }}</span>
        <span class="lo-num lo-log-kept" title="Mastery kept from this night, summed over skills">{{
          kept(s)
        }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
ol {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}
li {
  display: grid;
  grid-template-columns: 2.4ch 1fr 4.6em 3em 4.2em;
  gap: 8px;
  padding: 3px 0;
  border-top: 1px solid var(--lo-concrete-edge);
}
.lo-log-n {
  color: var(--lo-ink-faded);
  text-align: right;
}
.lo-log-end {
  color: var(--lo-chalk);
}
li.out .lo-log-end {
  color: var(--lo-guard-lamp);
}
.lo-log-t {
  text-align: right;
  color: var(--lo-searchlight);
}
.lo-log-intel {
  text-align: right;
  color: var(--lo-sodium);
}
.lo-log-kept {
  text-align: right;
  color: var(--lo-guard-lamp);
}
</style>

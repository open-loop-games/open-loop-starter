<!--
  PhaseTabs — the phases as folder tabs. Not navigation: the current phase is
  the doors opened, a past phase is struck through, and a phase not yet
  reached shows nothing of itself.
-->
<script setup lang="ts">
import { PHASES } from '../../data';

defineProps<{ phase: number }>();
</script>

<template>
  <ol class="nc-tabs" aria-label="Phases">
    <li
      v-for="(name, i) in PHASES.slice(0, 3)"
      :key="name"
      :class="{ current: i === phase, past: i < phase }"
      :aria-current="i === phase ? 'step' : undefined"
    >
      {{ i <= phase ? name : '· · ·' }}
    </li>
  </ol>
</template>

<style scoped>
.nc-tabs {
  display: flex;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0 0 6px;
  border-bottom: 1px solid var(--nc-soot-edge);
}
.nc-tabs li {
  padding: 5px 14px 4px;
  border: 1px solid var(--nc-soot-edge);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  color: var(--nc-carbon-faint);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.nc-tabs li.past {
  color: var(--nc-carbon);
  text-decoration: line-through;
  text-decoration-color: var(--nc-stamp);
}
.nc-tabs li.current {
  color: var(--nc-soot);
  background: var(--nc-manila);
  border-color: var(--nc-manila);
  font-weight: 600;
}
</style>

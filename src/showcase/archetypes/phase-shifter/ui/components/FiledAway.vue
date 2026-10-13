<!--
  FiledAway — what the doors have retired, each stamped. A mechanism whose
  role a later one took over is stamped REASSIGNED; the rest RETIRED. Shown,
  not removed, so the player sees the door was one-way.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getCase } from '../../modules';

const { life } = getCase();

const filed = computed(() =>
  life.mechanisms
    .filter((m) => m.retiredBy && m.label && life.isOpen(m.retiredBy).value)
    .map((m) => ({
      id: m.id,
      label: m.label!,
      stamp: life.mechanisms.some((n) => n.replaces === m.id) ? 'Reassigned' : 'Retired',
    })),
);
</script>

<template>
  <section v-if="filed.length" class="nc-filed" aria-label="Filed away">
    <h2 class="nc-label">Filed away</h2>
    <ul>
      <li v-for="f in filed" :key="f.id">
        <span>{{ f.label }}</span>
        <span class="nc-stamp" :class="f.stamp.toLowerCase()">{{ f.stamp }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.nc-filed {
  margin-top: 14px;
}
.nc-filed h2 {
  margin: 0 0 6px;
}
.nc-filed ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.nc-filed li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  color: var(--nc-carbon-faint);
}
.nc-filed li > span:first-child {
  text-decoration: line-through;
  text-decoration-color: var(--nc-soot-edge);
}
</style>

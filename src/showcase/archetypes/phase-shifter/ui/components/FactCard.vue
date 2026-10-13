<!--
  FactCard — one sighting as a small index card: who, in the book face; where
  and when, typed. Used on the corkboard and in the inbox.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { CARD_BY_ID, HOURS, PEOPLE, PLACES } from '../../data';

const props = defineProps<{ id: string }>();
const card = computed(() => CARD_BY_ID[props.id]);
const place = computed(() => PLACES.find((p) => p.id === card.value.where)!.displayName);
</script>

<template>
  <span class="nc-fact" :data-who="card.who">
    <span class="who">{{ PEOPLE[card.who] }}</span>
    <span class="when nc-num">{{ HOURS[card.when] }}</span>
    <span class="where">{{ place }}</span>
  </span>
</template>

<style scoped>
.nc-fact {
  display: grid;
  grid-template-columns: 1fr auto;
  align-content: start;
  gap: 0 6px;
  width: 100%;
  height: 100%;
  padding: 6px 8px 5px;
  background: linear-gradient(var(--nc-paper), #d9d0bd);
  border-top: 3px solid var(--nc-manila-deep);
  border-radius: 1px;
  color: var(--nc-soot);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.45);
  text-align: left;
}
.who {
  font-weight: 650;
  font-size: 15px;
  line-height: 1.2;
}
.where,
.when {
  font-family: var(--nc-face-typed);
  font-size: 11.5px;
  color: #4a4438;
  white-space: nowrap;
}
.when {
  justify-self: end;
  align-self: center;
}
.where {
  grid-column: 1 / -1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nc-fact[data-who='ada'] {
  border-top-color: var(--nc-string);
}
</style>

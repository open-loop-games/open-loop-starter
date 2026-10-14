<!--
  CostLine — a purchasable's price, one line item per stock. The engine prices the next
  unit, so it reads the item's cost requirements rather than re-deriving the ladder. A
  line item the stock cannot meet is vermilion, and one larger than its bin says so: no
  amount of waiting pays it before a warehouse.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { isCostRequirement, toNumber, type Purchasable } from '@open-loop/engine';
import type { ResourceId } from '../../data';
import { getWorks } from '../../modules';
import { stock } from '../format';

const props = defineProps<{ item: Purchasable }>();
const works = getWorks();

const lines = computed(() => {
  const reqs = Array.isArray(props.item.requirements)
    ? props.item.requirements
    : [props.item.requirements];
  return reqs.filter(isCostRequirement).map((r) => {
    const id = r.resource.id as ResourceId;
    const amount = toNumber(r.getCost(1));
    return {
      id,
      name: (r.resource.displayName ?? id).toLowerCase(),
      amount,
      short: toNumber(r.resource.value) < amount,
      overBin: amount > works.cap[id].value,
    };
  });
});
</script>

<template>
  <ul class="ae-cost">
    <li v-for="l in lines" :key="l.id" :class="{ short: l.short, over: l.overBin }">
      <span class="ae-figure">{{ stock(l.amount) }}</span> {{ l.name }}
      <em v-if="l.overBin" class="over-note">exceeds bin</em>
    </li>
  </ul>
</template>

<style scoped>
.ae-cost {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  font-size: 0.88rem;
  color: var(--ae-brass);
}
.ae-cost li.short {
  color: var(--ae-vermilion);
}
.over-note {
  font-style: normal;
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-left: 4px;
  border-bottom: 1px solid var(--ae-vermilion);
}
</style>

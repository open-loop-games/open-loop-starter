<script setup lang="ts">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import type { Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{
  purchasable: Purchasable;
  position: number;
  name: string;
  description: string;
}>();

const level = computed(() => format(props.purchasable.amount.value, 0));
const cost = computed(() => props.purchasable.getCost(1));
const canBuy = computed(() => props.purchasable.canPurchase.value);

function buy(): void {
  props.purchasable.purchase();
}
</script>

<template>
  <div class="crystal-row">
    <div class="crystal-row__head">
      <span class="crystal-row__pos">#{{ position }}</span>
      <strong class="crystal-row__name">{{ name }}</strong>
      <span class="crystal-row__level">Lv {{ level }}</span>
    </div>
    <p class="crystal-row__desc">
      {{ description }}
    </p>
    <Button
      :disabled="!canBuy"
      @click="buy"
    >
      {{ format(cost, 0) }} shards
    </Button>
  </div>
</template>

<style scoped>
.crystal-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.crystal-row__head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-xs);
}
.crystal-row__pos {
  font-size: 0.7em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.crystal-row__name {
  flex: 1 1 auto;
}
.crystal-row__level {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
}
.crystal-row__desc {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
</style>

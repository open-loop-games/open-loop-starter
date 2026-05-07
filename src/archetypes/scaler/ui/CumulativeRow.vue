<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'open-loop-engine';
import type { Purchasable } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{
  purchasable: Purchasable;
  name: string;
  description: string;
}>();

const owned = computed(() => format(props.purchasable.amount.value, 0));
const cost = computed(() => props.purchasable.getCost(1));
const canBuy = computed(() => props.purchasable.canPurchase.value);

function buy(): void {
  props.purchasable.purchase();
}
</script>

<template>
  <div class="cumulative-row">
    <div class="cumulative-row__head">
      <strong class="cumulative-row__name">{{ name }}</strong>
      <span class="cumulative-row__owned">×{{ owned }}</span>
    </div>
    <p class="cumulative-row__description">
      {{ description }}
    </p>
    <Button
      :disabled="!canBuy"
      @click="buy"
    >
      Buy — {{ format(cost, 0) }} coins
    </Button>
  </div>
</template>

<style scoped>
.cumulative-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.cumulative-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gap);
}
.cumulative-row__owned {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.cumulative-row__description {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'open-loop-engine';
import type { Purchasable } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{
  purchasable: Purchasable;
  position: number;
  name: string;
  description: string;
}>();

const cost = computed(() => props.purchasable.getCost(1));
const bought = computed(() => props.purchasable.active.value);
const canBuy = computed(() => props.purchasable.canPurchase.value);

function buy(): void {
  if (bought.value) return;
  props.purchasable.purchase();
}
</script>

<template>
  <div
    class="upgrade-cell"
    :data-bought="bought"
  >
    <div class="upgrade-cell__head">
      <span class="upgrade-cell__pos">#{{ position }}</span>
      <strong>{{ name }}</strong>
    </div>
    <p class="upgrade-cell__desc">
      {{ description }}
    </p>
    <div class="upgrade-cell__action">
      <Button
        v-if="!bought"
        :disabled="!canBuy"
        @click="buy"
      >
        {{ format(cost, 0) }} coins
      </Button>
      <span
        v-else
        class="upgrade-cell__bought"
      >Bought</span>
    </div>
  </div>
</template>

<style scoped>
.upgrade-cell {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.upgrade-cell[data-bought='true'] {
  background: var(--color-bg);
  opacity: 0.85;
  border-color: var(--color-accent, var(--color-border));
}
.upgrade-cell__head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-xs);
}
.upgrade-cell__pos {
  font-size: 0.7em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.upgrade-cell__desc {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
  flex: 1 1 auto;
}
.upgrade-cell__bought {
  font-weight: 600;
  font-size: 0.85em;
  color: var(--color-accent, var(--color-text));
}
</style>

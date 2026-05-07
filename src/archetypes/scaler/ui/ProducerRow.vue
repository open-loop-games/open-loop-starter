<script setup lang="ts">
import { computed } from 'vue';
import { format, Decimal } from 'open-loop-engine';
import type { Producer } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{
  producer: Producer;
  name: string;
}>();

const owned = computed(() => format(props.producer.ownedCount.value, 0));
const rate = computed(() =>
  format(Decimal.mul(props.producer.computedRate.value, props.producer.count.value), 2),
);

const repeatable = computed(() => props.producer.repeatable);
const cost = computed(() => repeatable.value?.getCost(1) ?? Decimal.dZero);
const canBuy = computed(() => repeatable.value?.canPurchase.value ?? false);

function buy(): void {
  repeatable.value?.purchase();
}
</script>

<template>
  <div class="producer-row">
    <div class="producer-row__head">
      <strong class="producer-row__name">{{ name }}</strong>
      <span class="producer-row__owned">owned: {{ owned }}</span>
      <span class="producer-row__rate">+{{ rate }}/s</span>
    </div>
    <div class="producer-row__action">
      <Button
        :disabled="!canBuy"
        @click="buy"
      >
        Buy — {{ format(cost, 0) }} coins
      </Button>
    </div>
  </div>
</template>

<style scoped>
.producer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.producer-row__head {
  display: flex;
  gap: var(--gap);
  align-items: baseline;
  flex-wrap: wrap;
}
.producer-row__name {
  min-width: 7em;
}
.producer-row__owned {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.producer-row__rate {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

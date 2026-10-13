<!--
  IndexCard — one purchase, drawn as an index card: its title, what it does,
  its price and how many are held. Renders inside the compositions' `#row` and
  `#card` slots, so the compositions own the list and this owns the card.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import type { CardExtra } from '../cards';

defineProps<{ card: CardExtra; can: boolean }>();
defineEmits<{ buy: [] }>();
</script>

<template>
  <Button
    class="nc-card"
    :class="{ can, automated: card.automated?.() }"
    :disabled="!can"
    :aria-label="card.title()"
    @click="$emit('buy')"
  >
    <span class="title">{{ card.title() }}</span>
    <span v-if="card.owned?.()" class="owned nc-num">{{ card.owned!() }}</span>
    <span class="description">{{ card.description() }}</span>
    <span class="price nc-num">{{ card.price() }}</span>
  </Button>
</template>

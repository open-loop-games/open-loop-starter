<!--
  BuyCard — one purchasable line: what it is, what it costs, and whether you can pay. The
  whole card is the button. The affordance grammar is here so every panel reads the same
  way: sodium when you can buy, a short price in rust, dashed while a prerequisite is
  missing, faded once done. The ley-light runs along a line the moment it opens.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import type { PriceLine } from '@/ui/compositions';
import { grouped } from '../format';

const props = defineProps<{
  title: string;
  note?: string;
  count?: string;
  /** The engine's price lines, one per resource. */
  prices?: PriceLine[];
  /** The game says you can buy it now. */
  can: boolean;
  /** What the purchase waits on ("needs a chop shop"), shown in place of the price. */
  locked?: string;
  maxed?: boolean;
  /** What a maxed card says it is. Default: done. */
  doneLabel?: string;
  /** The lieutenant who buys this for you. */
  automated?: string;
}>();
defineEmits<{ buy: [] }>();

/** Just opened: the prerequisite landed this moment. The ley mark fades after a few seconds. */
const fresh = ref(false);
watch(
  () => props.locked,
  (now, before) => {
    if (before && !now) {
      fresh.value = true;
      setTimeout(() => (fresh.value = false), 6000);
    }
  },
);

const state = computed(() => {
  if (props.maxed) return 'maxed';
  if (props.locked) return 'locked';
  return props.can ? 'afford' : 'short';
});
</script>

<template>
  <Button
    class="buy"
    :data-state="state"
    :data-fresh="fresh"
    :disabled="state !== 'afford'"
    :aria-label="`Buy ${title}`"
    repeat
    @click="$emit('buy')"
  >
    <span class="buy__head">
      <span class="buy__title">{{ title }}</span>
      <span v-if="count !== undefined" class="buy__count num">{{ count }}</span>
    </span>
    <span v-if="note" class="buy__note">{{ note }}</span>
    <span class="buy__foot">
      <span v-if="maxed" class="buy__cost buy__cost--done">✓ {{ doneLabel ?? 'done' }}</span>
      <span v-else-if="locked" class="buy__cost buy__cost--locked">⌁ {{ locked }}</span>
      <template v-else>
        <span
          v-for="line in prices"
          :key="line.resource.id"
          class="buy__cost num"
          :data-currency="line.resource.displayName"
          :data-short="line.short"
          >{{ grouped(toNumber(line.amount)) }} {{ line.resource.displayName }}</span
        >
      </template>
      <span v-if="automated" class="cc-auto buy__auto" :title="`${automated} handles this`">{{
        automated
      }}</span>
    </span>
  </Button>
</template>

<style scoped>
.buy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 7px 9px 6px;
  text-align: left;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-left-width: 3px;
  border-radius: var(--cc-notch);
  color: var(--cc-chalk);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}
.buy:disabled {
  opacity: 1;
  cursor: default;
}
.buy[data-state='afford'] {
  border-color: var(--cc-sodium-deep);
  border-left-color: var(--cc-sodium);
  background:
    linear-gradient(90deg, var(--cc-sodium-glow), transparent 70%), var(--cc-asphalt-raised);
}
.buy[data-state='afford']:hover {
  border-color: var(--cc-sodium);
}
.buy[data-state='locked'] {
  border-style: dashed;
  border-left-style: solid;
  border-left-color: var(--cc-rain);
  opacity: 0.72;
}
.buy[data-state='maxed'] {
  border-left-color: var(--cc-chalk-faint);
  opacity: 0.6;
}
/* A reveal: the ley-light runs once along a line that just opened. */
.buy[data-fresh='true'] {
  border-left-color: var(--cc-ley);
  position: relative;
  overflow: hidden;
}
.buy[data-fresh='true']::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, var(--cc-ley-glow) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: cc-ley-run 1.4s ease-out 2;
  pointer-events: none;
}
@keyframes cc-ley-run {
  to {
    transform: translateX(100%);
  }
}
.buy__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.buy__title {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cc-chalk);
}
/* Kenney High has no tabular figures, so a live count gets a fixed right-aligned box:
   a changing digit never moves a neighbour. */
.buy__count {
  display: inline-block;
  min-width: 4ch;
  text-align: right;
  font-family: var(--cc-face-neon);
  font-size: 22px;
  line-height: 0.8;
  color: var(--cc-chalk);
}
.buy[data-state='afford'] .buy__count {
  color: var(--cc-sodium);
}
.buy__note {
  font-size: 11.5px;
  color: var(--cc-chalk-dim);
}
.buy__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 11.5px;
}
.buy__cost {
  color: var(--cc-chalk-dim);
}
.buy__cost[data-currency='scrip'][data-short='false'] {
  color: var(--cc-brass);
}
.buy__cost[data-currency='aether'][data-short='false'] {
  color: var(--cc-ley);
}
.buy__cost[data-short='true'] {
  color: var(--cc-short);
}
.buy__cost--locked {
  color: var(--cc-chalk-faint);
}
.buy__auto {
  margin-left: auto;
}
</style>

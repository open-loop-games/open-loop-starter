<!--
  TipWire — the telegraph tape over the holdings. Quiet, it prints the effects
  in force and how long each has left. When a tip comes in, the tape turns brass
  and offers it: take it before it runs off the end. No desk takes tips.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { BULL_MULT, SPREE_MULT, TIP_LIFETIME } from '../../data';
import { getTips, type TipEffect } from '../../modules';

const tips = getTips();

const up = computed(() => tips.current.value !== null);
const lifetime = computed(() => TIP_LIFETIME * tips.scale.value.lifetime);
const left = computed(() => (tips.current.value ?? 0) / lifetime.value);

const EFFECT_COPY: Record<TipEffect, string> = {
  bull: `Bull market: everything earns ×${BULL_MULT}`,
  spree: `Closing spree: deals by hand pay ×${SPREE_MULT}`,
  windfall: 'A windfall deal, paid on cash on hand',
};
const lastCaught = ref<TipEffect | null>(null);
function take() {
  lastCaught.value = tips.catchTip();
}

const inForce = computed(() =>
  tips.effects.getActive().map((e) => ({
    id: e.id,
    label: e.defId === 'bull' ? `Bull market ×${BULL_MULT}` : `Closing spree ×${SPREE_MULT}`,
    seconds: Math.ceil(e.timeRemaining.value),
  })),
);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<template>
  <section class="wire" :class="{ live: up }" aria-live="polite">
    <span class="wire-head smallcaps">The wire</span>
    <template v-if="up">
      <Button class="tip smallcaps" :repeat="false" data-testid="tip" @click="take">
        A tip on the wire: take it
      </Button>
      <ProgressBar class="tip-left" :value="left" />
    </template>
    <template v-else>
      <span v-for="e in inForce" :key="e.id" class="force num"
        >{{ e.label }} · {{ clock(e.seconds) }}</span
      >
      <span v-if="!inForce.length" class="quiet">
        {{ lastCaught ? EFFECT_COPY[lastCaught] : 'Quiet. Keep an eye on the tape.' }}
      </span>
    </template>
  </section>
</template>

<style scoped>
.wire {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 6px 12px;
  margin-bottom: 10px;
  background: var(--tape-paper);
  color: var(--tape-ink);
  font-family: var(--face-adding-machine);
  font-size: 13px;
  border-radius: var(--radius-paper);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15);
}
.wire-head {
  font-size: 12px;
  opacity: 0.6;
}
.wire.live {
  background: var(--ink-seal);
  animation: wire-arrive 0.6s ease-out;
}
.tip {
  flex: none;
  padding: 4px 12px;
  font-family: var(--face-letterhead);
  font-size: 15px;
  color: var(--walnut);
  background: var(--ledger-paper);
  border: 1px solid var(--walnut);
  border-radius: var(--radius-paper);
}
.tip-left {
  flex: 1;
  --progress-bar-fill: var(--walnut);
  --progress-bar-track: rgba(23, 18, 14, 0.2);
  --progress-bar-radius: 0;
  --progress-bar-transition: width 0.25s linear;
}
.tip-left :deep(.olui-progress-bar__track) {
  min-height: 3px;
}
.force {
  padding: 1px 8px;
  border: 1px solid var(--tape-ink);
  border-radius: var(--radius-paper);
}
.quiet {
  opacity: 0.7;
}
@keyframes wire-arrive {
  from {
    transform: translateY(-3px);
    box-shadow: 0 0 18px rgba(210, 169, 78, 0.6);
  }
  to {
    transform: none;
  }
}
</style>

<!--
  BurnTierPanel — the reach-gated pace ladder (`addBurnTier`). Each tier authors
  its own (g, T_g); deeper tiers raise g for a steeper, shorter, sharper run.
  Advancing is a deliberate, one-way, reach-gated step (it's what the Dampen
  lever pushes back on). A switch lands on the NEXT run — the schedule freezes at
  run start — so this is a between-runs decision.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getBurnTier } from '../../modules';
import { BURN_TIERS } from '../../data/threat';

const burnTier = getBurnTier();

const activeIndex = computed(() => burnTier.activeIndex.value);
const unlockedIndex = computed(() => burnTier.unlockedIndex.value);
const canAdvance = computed(() => burnTier.canAdvance.value);
const nextUnlockL = computed(() => burnTier.nextUnlockPowerLevel.value);

function stateOf(index: number): 'active' | 'unlocked' | 'locked' {
  if (index === activeIndex.value) return 'active';
  if (index <= unlockedIndex.value) return 'unlocked';
  return 'locked';
}
</script>

<template>
  <section class="tiers">
    <h3 class="tiers__title">
      Burn tier
    </h3>
    <ol class="tiers__list">
      <li
        v-for="(tier, i) in BURN_TIERS"
        :key="tier.label"
        class="tier"
        :data-state="stateOf(i)"
      >
        <span class="tier__label">{{ tier.label }}</span>
        <span class="tier__g">g&nbsp;{{ tier.escalationBase }}</span>
        <span class="tier__gate">
          <template v-if="stateOf(i) === 'locked'">L&nbsp;≥&nbsp;{{ tier.unlockPowerLevel }}</template>
          <template v-else-if="stateOf(i) === 'active'">active</template>
          <template v-else>ready</template>
        </span>
      </li>
    </ol>
    <Button
      class="tiers__advance"
      :disabled="!canAdvance"
      @click="burnTier.advanceTier()"
    >
      <span v-if="canAdvance">Advance tier →</span>
      <span v-else-if="nextUnlockL !== null">Next unlocks at Power L {{ nextUnlockL }}</span>
      <span v-else>Max tier</span>
    </Button>
  </section>
</template>

<style scoped>
.tiers {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tiers__title {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.tiers__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tier {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--gap-sm);
  padding: 5px var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.tier[data-state='active'] {
  border-color: var(--cyc-hot);
  background: color-mix(in srgb, var(--cyc-hot) 12%, var(--color-surface));
}
.tier[data-state='locked'] {
  opacity: 0.5;
}
.tier__label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text);
}
.tier__g {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
  color: var(--cyc-hot);
}
.tier__gate {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  min-width: 44px;
  text-align: right;
}
.tier[data-state='active'] .tier__gate {
  color: var(--cyc-hot);
}
.tiers__advance {
  margin-top: 2px;
  padding: 6px var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: not-allowed;
}
.tiers__advance:not(:disabled) {
  background: color-mix(in srgb, var(--cyc-hot) 20%, var(--color-surface));
  color: var(--color-text);
  border-color: var(--cyc-hot);
  cursor: pointer;
}
</style>

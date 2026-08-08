<!--
  ProphecyPanel — the salvo-posture ladder drawn as the Prophecy draft (studio/
  open-loop-starter#21 leaf 5: ladder-as-cards, UI only). The model is a one-way,
  reach-gated ladder (Standard→Accelerated→Cascade→Collapse); each posture authors a
  steeper per-wave g for a sharper, shorter run. A switch lands on the NEXT run (the
  kernel freezes the schedule at run start), so this is a between-runs decision.
  Advancing steps one rung when reach unlocks it. Shows the effective (Dampen-bent) g.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getBurnTier } from '../../modules';
import { SALVO_POSTURES } from '../../data/defense';
import { useCommandState } from '../../composables/useCommandState';

const burnTier = getBurnTier();
const cmd = useCommandState();

const activeIndex = computed(() => burnTier.activeIndex.value);
const unlockedIndex = computed(() => burnTier.unlockedIndex.value);
const canAdvance = computed(() => burnTier.canAdvance.value);
const nextUnlockL = computed(() => burnTier.nextUnlockPowerLevel.value);
const lastIndex = SALVO_POSTURES.length - 1;

function stateOf(i: number): 'active' | 'ready' | 'locked' {
  if (i === activeIndex.value) return 'active';
  if (i <= unlockedIndex.value) return 'ready';
  return 'locked';
}
function waves(i: number): number {
  return Math.round(burnTier.runLengthAt(i));
}
function pick(i: number): void {
  // One-way ladder: only the immediately-next unlocked rung advances.
  if (canAdvance.value && i === activeIndex.value + 1) burnTier.advanceTier();
}
</script>

<template>
  <div class="cyc-panel cyc-prophecy">
    <div class="cyc-prophecy__ph">
      <span class="cyc-prophecy__t">Prophecy</span>
      <span class="cyc-prophecy__s">effective g {{ cmd.bentG.value.toFixed(2) }}</span>
    </div>
    <div class="cyc-prophecy__cards">
      <button
        v-for="(p, i) in SALVO_POSTURES"
        :key="p.label"
        class="cyc-oracle"
        :class="{
          sel: stateOf(i) === 'active',
          surge: i === lastIndex,
          locked: stateOf(i) === 'locked',
          pickable: canAdvance && i === activeIndex + 1,
        }"
        :disabled="!(canAdvance && i === activeIndex + 1)"
        @click="pick(i)"
      >
        <span class="cyc-oracle__g">{{ p.label }}</span>
        <span class="cyc-oracle__mult">g {{ p.salvoBase }}</span>
        <span class="cyc-oracle__rw">
          <template v-if="stateOf(i) === 'locked'">L≥{{ p.unlockPowerLevel }}</template>
          <template v-else>~{{ waves(i) }}w</template>
        </span>
      </button>
    </div>
    <Button
      class="cyc-btn cyc-prophecy__advance"
      :class="{ broke: !canAdvance }"
      :disabled="!canAdvance"
      @click="burnTier.advanceTier()"
    >
      <template v-if="canAdvance"> Advance posture → </template>
      <template v-else-if="nextUnlockL !== null"> Next unlocks at L {{ nextUnlockL }} </template>
      <template v-else> Max posture </template>
    </Button>
  </div>
</template>

<style scoped>
.cyc-prophecy__ph {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
}
.cyc-prophecy__t {
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--cyc-amb);
}
.cyc-prophecy__s {
  font-size: 9.5px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
.cyc-prophecy__cards {
  display: flex;
  gap: 6px;
}
.cyc-oracle {
  flex: 1;
  min-width: 0;
  padding: 8px 2px;
  text-align: center;
  background: rgba(4, 7, 10, 0.6);
  border: 1px solid var(--cyc-grn2);
  position: relative;
  font-family: var(--cyc-mono);
  color: var(--cyc-grn);
  cursor: default;
}
.cyc-oracle.pickable {
  cursor: pointer;
  border-color: var(--cyc-grn);
}
.cyc-oracle.pickable:hover {
  box-shadow: inset 0 0 0 1px var(--cyc-grn);
}
.cyc-oracle.locked {
  opacity: 0.45;
}
.cyc-oracle.surge {
  border-color: var(--cyc-red);
}
.cyc-oracle.surge .cyc-oracle__mult {
  color: var(--cyc-red);
}
.cyc-oracle.sel {
  border-color: var(--cyc-amb);
}
.cyc-oracle.sel::after {
  content: '◄';
  position: absolute;
  top: 3px;
  right: 4px;
  color: var(--cyc-amb);
  font-size: 8px;
}
.cyc-oracle.sel .cyc-oracle__mult {
  color: var(--cyc-amb);
}
.cyc-oracle__g {
  display: block;
  font-size: 8.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  opacity: 0.75;
}
.cyc-oracle__mult {
  display: block;
  font-size: 15px;
  margin: 3px 0 1px;
  color: var(--cyc-grn);
  font-variant-numeric: tabular-nums;
}
.cyc-oracle__rw {
  display: block;
  font-size: 9px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
.cyc-prophecy__advance {
  width: 100%;
  margin-top: 9px;
  text-align: center;
}
</style>

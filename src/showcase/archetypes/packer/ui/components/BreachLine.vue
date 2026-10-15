<!--
  BreachLine — the swarm the guns are holding, drawn full width over the bay. Presentation
  only: salvage is paid per point of damage, so the drones downed are read back from
  cumulative salvage, and the drones' crossing speed follows the firepower fitted. The
  only place breach red appears.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { PULSE_COST0, SALVAGE_PER_DAMAGE } from '../../data';
import { getBoard, getYard } from '../../modules';
import { fmt } from '../format';

const yard = getYard();
const board = getBoard();

/** Hull points of one swarm drone. */
const DRONE_HP = 12;
const LANES = 9;

// The starting purse counts toward cumulative salvage but was never damage dealt.
const damage = computed(
  () =>
    (Decimal.fromValue(yard.salvage.cumulative?.value ?? 0).toNumber() - PULSE_COST0) /
    SALVAGE_PER_DAMAGE,
);
const downed = computed(() => Math.max(0, Math.floor(damage.value / DRONE_HP)));
const killRate = computed(() => board.firepower.value / DRONE_HP);

/**
 * Seconds for one drone to cross and die, quantized to a few steps so the CSS animation
 * is not restarted on every tick. Zero when nothing is firing.
 */
const sweep = computed(() => {
  const k = killRate.value;
  if (k <= 0) return 0;
  const raw = LANES / k;
  const steps = [0.9, 1.4, 2.2, 3.4, 5, 7.5];
  return steps.find((s) => s >= raw) ?? 7.5;
});
</script>

<template>
  <div class="breach-line" :class="{ silent: !sweep }">
    <div class="ship" aria-hidden="true">
      <span class="muzzle" :style="{ animationDuration: `${Math.max(0.12, sweep / LANES)}s` }" />
    </div>
    <div class="field" aria-hidden="true">
      <span
        v-for="i in LANES"
        :key="i"
        class="drone"
        :style="{
          '--i': i,
          top: `${8 + ((i * 37) % 70)}%`,
          animationDuration: `${sweep || 6}s`,
          animationDelay: `${-((i * (sweep || 6)) / LANES)}s`,
        }"
      />
    </div>
    <div class="tally">
      <div>
        <span class="big hp-num">{{ fmt(downed, 0) }}</span> drones downed
      </div>
      <div class="hp-num">{{ fmt(killRate) }} / s</div>
    </div>
  </div>
</template>

<style scoped>
.breach-line {
  position: relative;
  display: grid;
  grid-template-columns: 70px 1fr 190px;
  align-items: center;
  height: 64px;
  flex: none;
  border-bottom: 1px solid var(--hull-seam);
  background: linear-gradient(
    90deg,
    rgba(255, 181, 71, 0.05),
    transparent 30%,
    rgba(255, 93, 93, 0.06)
  );
  overflow: hidden;
}
.ship {
  position: relative;
  height: 22px;
  margin-left: 18px;
  width: 34px;
  background: var(--blueprint-dim);
  clip-path: polygon(0 0, 70% 20%, 100% 50%, 70% 80%, 0 100%, 15% 50%);
}
.muzzle {
  position: absolute;
  right: -2px;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--plasma-hot);
  animation: muzzle linear infinite;
}
.silent .muzzle {
  animation: none;
  opacity: 0;
}
/* A size container, so a drone's crossing is the field's own width at any viewport. */
.field {
  position: relative;
  height: 100%;
  container-type: size;
}
.drone {
  position: absolute;
  left: 100%;
  width: 9px;
  height: 9px;
  background: var(--breach);
  clip-path: polygon(100% 0, 0 50%, 100% 100%, 70% 50%);
  animation: inbound linear infinite;
  will-change: transform, opacity;
}
.silent .drone {
  animation-play-state: paused;
  opacity: 0.35;
}
.tally {
  text-align: right;
  padding-right: 24px;
  color: var(--readout-dim);
  font-size: 12px;
}
.tally .big {
  color: var(--breach);
  font-size: 18px;
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .muzzle,
  .drone {
    animation: none;
  }
  .drone {
    opacity: 0.5;
    transform: translateX(calc(var(--i) * -9cqw));
  }
}
@keyframes inbound {
  0% {
    transform: translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  78% {
    transform: translateX(-88cqw) scale(1);
    opacity: 1;
  }
  84% {
    transform: translateX(-91cqw) scale(2.2);
    opacity: 0;
  }
  100% {
    transform: translateX(-91cqw) scale(2.2);
    opacity: 0;
  }
}
@keyframes muzzle {
  0%,
  40% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
}
</style>

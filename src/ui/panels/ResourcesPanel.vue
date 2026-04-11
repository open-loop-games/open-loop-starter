<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { ProgressBar } from 'open-loop-ui';
import { coreState } from '@/modules/core';

const state = coreState!;
const wood = computed(() => format(Decimal.floor(state.resources.wood.value)));
const stone = computed(() => format(Decimal.floor(state.resources.stone.value)));
const gold = computed(() => format(Decimal.floor(state.resources.gold.value)));

const woodcuttingLvl = computed(() =>
  format(Decimal.floor(state.skills.woodcutting.level.value)),
);
const miningLvl = computed(() =>
  format(Decimal.floor(state.skills.mining.level.value)),
);

// Fractional progress to next level. xpToLevel is floor(xp/10) for
// woodcutting and floor(xp/12) for mining — so in-level progress is
// (xp mod xpPerLevel) / xpPerLevel. Clamped into [0,1] by ProgressBar.
const progressToNext = (xp: unknown, xpPerLevel: number) => {
  const raw = Decimal.sub(
    xp as number,
    Decimal.mul(Decimal.floor(Decimal.div(xp as number, xpPerLevel)), xpPerLevel),
  );
  return Decimal.div(raw, xpPerLevel).toNumber();
};
const woodcuttingProgress = computed(() =>
  progressToNext(state.skills.woodcutting.xp.value, 10),
);
const miningProgress = computed(() =>
  progressToNext(state.skills.mining.xp.value, 12),
);
</script>

<template>
  <div class="resources-panel">
    <div class="resource">
      <span class="label">Wood</span>
      <span class="value">{{ wood }}</span>
    </div>
    <div class="resource">
      <span class="label">Stone</span>
      <span class="value">{{ stone }}</span>
    </div>
    <div class="resource">
      <span class="label">Gold</span>
      <span class="value">{{ gold }}</span>
    </div>
    <div class="skill">
      <span class="label">Woodcutting</span>
      <span class="value">Lv {{ woodcuttingLvl }}</span>
      <ProgressBar :value="woodcuttingProgress" data-testid="skill-progress-woodcutting" />
    </div>
    <div class="skill">
      <span class="label">Mining</span>
      <span class="value">Lv {{ miningLvl }}</span>
      <ProgressBar :value="miningProgress" data-testid="skill-progress-mining" />
    </div>
  </div>
</template>

<style scoped>
.resources-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--gap);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.resource,
.skill {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.label {
  font-size: 0.75em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.value {
  font-weight: 600;
}
</style>

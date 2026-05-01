<script setup lang="ts">
import { computed } from 'vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useMana } from '../../composables/useMana';
import { useLoop } from '../../composables/useLoop';
import { useActionQueue } from '../../composables/useActionQueue';
import { useActionRunner } from '../../composables/useActionRunner';

const manaApi = useMana();
const loop = useLoop();
const queue = useActionQueue();
const runner = useActionRunner();
const { format } = useFormatting();

const manaValue = computed(() => manaApi.getManaValue());
const totalBudget = computed(() => manaApi.getTotalManaBudget());
const fillRatio = computed(() => {
  const budget = manaApi.getTotalManaBudget();
  if (budget.lte(0)) return 0;
  return Math.min(1, manaApi.getManaValue().div(budget).toNumber());
});

const currentRow = computed(() => {
  const items = queue.activeQueue.items.value;
  const cursorIdx = queue.getActiveCursor();
  const item = items[cursorIdx];
  if (!item) return undefined;
  const def = runner.getActionDef(item.id);
  if (!def) return undefined;
  const fraction = runner.getActionProgress(item.id);
  const adjustedTicks = runner.computeAdjustedTicks(def).toNumber();
  return {
    def,
    progressFraction: { value: fraction },
    progress: { value: Math.floor(fraction * adjustedTicks) },
    adjustedTicks: { value: adjustedTicks },
  };
});
</script>

<template>
  <section class="current-loop-panel">
    <header class="loop-header">
      <div class="loop-header__title">
        <span class="loop-header__label">Loop</span>
        <span
          class="loop-header__value"
          data-testid="loop-count"
        >{{ loop.loopCount.value }}</span>
      </div>
      <div class="loop-header__elapsed">
        elapsed
        <strong data-testid="loop-elapsed">{{ Math.floor(loop.getElapsed()) }}s</strong>
      </div>
    </header>

    <div class="mana-gauge">
      <div class="mana-gauge__readout">
        <span class="mana-gauge__label">Mana</span>
        <span
          class="mana-gauge__value"
          data-testid="mana-readout"
        >
          {{ format(manaValue, 0) }} / {{ format(totalBudget, 0) }}
        </span>
      </div>
      <ProgressBar
        :value="fillRatio"
        :max="1"
        data-testid="mana-bar"
      />
    </div>

    <div
      v-if="currentRow"
      class="current-action"
    >
      <header class="current-action__header">
        <span class="current-action__label">Now</span>
        <strong
          class="current-action__name"
          data-testid="current-action-name"
        >{{
          currentRow.def.name
        }}</strong>
      </header>
      <ProgressBar
        :value="currentRow.progressFraction.value"
        :max="1"
        data-testid="current-action-progress"
      />
      <div class="current-action__meta">
        <span>{{ format(currentRow.progress.value, 0) }} /
          {{ format(currentRow.adjustedTicks.value, 0) }} mana</span>
        <span class="current-action__zone">{{ currentRow.def.zoneId }}</span>
      </div>
    </div>
    <div
      v-else
      class="current-action current-action--idle"
    >
      <span>Queue is empty. Add an action from the drawer to begin.</span>
    </div>
  </section>
</template>

<style scoped>
.current-loop-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
  background: var(--color-surface-alt, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.loop-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.92em;
}

.loop-header__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.8em;
  margin-right: 6px;
}

.loop-header__value {
  font-weight: 700;
  font-size: 1.4em;
  font-variant-numeric: tabular-nums;
}

.loop-header__elapsed {
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.mana-gauge {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mana-gauge__readout {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.9em;
}

.mana-gauge__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.78em;
}

.mana-gauge__value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.current-action {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.current-action--idle {
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
  padding: var(--gap-lg);
}

.current-action__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-action__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.78em;
}

.current-action__name {
  font-weight: 600;
}

.current-action__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.current-action__zone {
  font-style: italic;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useUnits, useCounterMatrix } from '../../composables';
import { useModule } from '@/composables/useModule';
import { useFormatting } from '@/composables/useFormatting';
import { getIncome, TugDataKey, type Side } from '../../modules';
import ProgressBar from '@/ui/components/ProgressBar.vue';

const props = withDefaults(
  defineProps<{
    side?: Side;
  }>(),
  { side: 'player' },
);

const data = useModule(TugDataKey);
const units = useUnits(props.side);
const income = getIncome(props.side);
const matrix = useCounterMatrix();
const { format } = useFormatting();

const resourceLabel = computed(() => data.theme.resourceName.plural);
const balance = computed(() => format(income.value, 0));

function counterHints(archetypeId: string): string {
  const top = matrix.topStrongCounters(archetypeId, 2);
  if (top.length === 0) return 'no strong counters';
  return `vs ${top.map((d) => d.role.toLowerCase()).join(', ')}`;
}
</script>

<template>
  <div class="unit-shop">
    <div class="unit-shop__header">
      <h3>Send units</h3>
      <span class="unit-shop__balance"> {{ balance }} {{ resourceLabel }} </span>
    </div>
    <div class="unit-shop__grid">
      <button
        v-for="row in units.rows.value"
        :key="row.def.id"
        class="unit-card"
        :class="{
          'unit-card--ready': row.ready.value,
          'unit-card--cooldown': row.cooldownRemaining.value > 0,
        }"
        :disabled="!row.ready.value"
        :title="row.def.role"
        @click="row.send()"
      >
        <div class="unit-card__title">
          {{ row.def.name }}
        </div>
        <div class="unit-card__role">
          {{ row.def.role }}
        </div>
        <div class="unit-card__counter">
          {{ counterHints(row.def.id) }}
        </div>
        <div class="unit-card__cost">
          {{ format(row.def.cost, 0) }} {{ resourceLabel }}
        </div>
        <div
          v-if="row.cooldownRemaining.value > 0"
          class="unit-card__cooldown"
        >
          <ProgressBar
            :value="row.def.sendCooldownSec - row.cooldownRemaining.value"
            :max="row.def.sendCooldownSec"
            :label="`${row.cooldownRemaining.value.toFixed(1)}s`"
          />
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.unit-shop {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap);
  height: 100%;
}

.unit-shop__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.unit-shop__header h3 {
  margin: 0;
  font-size: 1em;
}

.unit-shop__balance {
  font-variant-numeric: tabular-nums;
  color: var(--color-primary, #4a9eff);
  font-weight: 600;
}

.unit-shop__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--gap-sm);
}

.unit-card {
  text-align: left;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius) * 0.75);
  padding: var(--gap-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.unit-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.unit-card:not(:disabled):hover {
  border-color: var(--color-primary, #4a9eff);
}

.unit-card--ready {
  border-color: var(--color-primary, #4a9eff);
}

.unit-card__title {
  font-weight: 600;
}

.unit-card__role {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.unit-card__counter {
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
}

.unit-card__cost {
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
}

.unit-card__cooldown {
  margin-top: 4px;
}
</style>

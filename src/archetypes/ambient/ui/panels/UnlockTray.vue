<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AutoProducersKey, SceneKey, UnlocksKey } from '../../modules';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useFormatting } from '@/composables/useFormatting';
import Tooltip from '@/ui/components/Tooltip.vue';
import type { UnlockDef } from '../../data/types';

const unlocks = useModule(UnlocksKey);
const buildings = useModule(AutoProducersKey);
const scene = useModule(SceneKey);
const { lifetime } = useHeadlineRate();
const { format } = useFormatting();

interface Cell {
  id: string;
  def: UnlockDef;
  label: string;
  earned: boolean;
  reveals: string;
}

function describeReveals(def: UnlockDef): string {
  const r = def.reveals;
  if (r.kind === 'producer') {
    const producer = buildings.getEntry(r.producerId)?.def;
    return producer ? `Reveals the ${producer.name}` : `Reveals producer ${r.producerId}`;
  }
  if (r.kind === 'scene-variant') {
    const variant = scene.getVariant(r.variantId);
    return variant ? `Reveals the ${variant.label} scene` : `Reveals scene ${r.variantId}`;
  }
  switch (r.affordance) {
    case 'achievement-grid':
      return 'Opens the Garden Almanac';
    case 'welcome-back':
      return 'Welcomes you back after time away';
    case 'prestige':
      return 'Unlocks prestige';
  }
}

const cells = computed<Cell[]>(() =>
  unlocks.getAll().map((entry) => {
    const def = entry.def;
    const earned = entry.purchasable.active.value === true;
    return {
      id: def.id,
      def,
      label: earned ? def.label : '?',
      earned,
      reveals: describeReveals(def),
    };
  }),
);

const earnedCount = computed(() => cells.value.filter((c) => c.earned).length);

function progressLabel(def: UnlockDef, earned: boolean): string {
  const current = Decimal.fromValue(lifetime.value);
  const target = Decimal.fromValue(def.threshold);
  if (current.gte(target)) return 'Reached';
  const targetText = earned ? format(target, 0) : '??';
  return `${format(current, 0)} / ${targetText} sprouts lifetime`;
}
</script>

<template>
  <section class="unlock-tray">
    <h3 class="panel-title">
      Discoveries · {{ earnedCount }} / {{ cells.length }}
    </h3>
    <ul class="cells">
      <Tooltip
        v-for="c in cells"
        :key="c.id"
        :side-offset="6"
      >
        <li
          class="cell"
          :data-earned="c.earned ? 'true' : 'false'"
          :data-testid="`unlock-${c.id}`"
          tabindex="0"
        >
          {{ c.label }}
        </li>
        <template #content>
          <div class="cell-tip">
            <div class="cell-tip__name">
              {{ c.earned ? c.def.label : 'Hidden discovery' }}
            </div>
            <div
              v-if="c.earned"
              class="cell-tip__reveals"
            >
              {{ c.reveals }}
            </div>
            <div class="cell-tip__progress">
              {{ progressLabel(c.def, c.earned) }}
            </div>
          </div>
        </template>
      </Tooltip>
    </ul>
  </section>
</template>

<style scoped>
.unlock-tray {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}

.cells {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--gap-sm);
}

.cell {
  padding: 6px 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.82em;
  text-align: center;
  color: var(--color-text-muted);
  cursor: default;
}

.cell:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.cell[data-earned='true'] {
  color: var(--color-text);
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.cell-tip {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell-tip__name {
  font-weight: 600;
}

.cell-tip__reveals {
  opacity: 0.85;
}

.cell-tip__progress {
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}
</style>

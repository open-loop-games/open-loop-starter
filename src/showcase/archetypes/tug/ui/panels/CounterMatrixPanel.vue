<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCounterMatrix } from '../../composables';
import { useModule } from '@/composables/useModule';
import { TugDataKey } from '../../modules';
import type { UnitDef } from '../../data/types';

/**
 * Declared-invention 6×6 interactive matrix. Cells coloured strong (green) /
 * weak (red) / neutral (transparent). Click a cell to pin attribution
 * details below the grid.
 */
const matrix = useCounterMatrix();
const data = useModule(TugDataKey);

const units = computed<UnitDef[]>(() => data.units);

interface Cell {
  attacker: UnitDef;
  defender: UnitDef;
  value: number;
  relation: 'strong' | 'weak' | 'neutral';
}

const selected = ref<Cell | null>(null);

function cellAt(attacker: UnitDef, defender: UnitDef): Cell {
  return {
    attacker,
    defender,
    value: matrix.cellValue(attacker.id, defender.id),
    relation: matrix.cellRelation(attacker.id, defender.id),
  };
}

function selectCell(attacker: UnitDef, defender: UnitDef): void {
  selected.value = cellAt(attacker, defender);
}
</script>

<template>
  <div class="olui-surface counter-matrix">
    <h3 class="counter-matrix__title">
      Counter matrix
      <span class="counter-matrix__hint">attacker → defender damage multiplier</span>
    </h3>
    <table class="counter-matrix__table">
      <thead>
        <tr>
          <th />
          <th
            v-for="defender in units"
            :key="`d-${defender.id}`"
            :title="defender.role"
          >
            {{ defender.name.slice(0, 4) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="attacker in units"
          :key="`r-${attacker.id}`"
        >
          <th
            scope="row"
            :title="attacker.role"
          >
            {{ attacker.name.slice(0, 4) }}
          </th>
          <td
            v-for="defender in units"
            :key="`c-${attacker.id}-${defender.id}`"
            class="counter-matrix__cell"
            :data-relation="matrix.cellRelation(attacker.id, defender.id)"
            :title="`${attacker.name} → ${defender.name}: ×${matrix.cellValue(attacker.id, defender.id).toFixed(2)}`"
            @click="selectCell(attacker, defender)"
          >
            {{ matrix.cellValue(attacker.id, defender.id).toFixed(2) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="selected"
      class="counter-matrix__detail"
    >
      <strong>{{ selected.attacker.name }}</strong>
      → {{ selected.defender.name }}: ×{{ selected.value.toFixed(2) }} ({{ selected.relation }})
    </div>
  </div>
</template>

<style scoped>
.counter-matrix {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  height: 100%;
}

.counter-matrix__title {
  margin: 0;
  font-size: 1em;
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
}

.counter-matrix__hint {
  font-weight: normal;
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
}

.counter-matrix__table {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  width: 100%;
}

.counter-matrix__table th,
.counter-matrix__table td {
  padding: 4px 6px;
  text-align: center;
  border: 1px solid var(--color-border);
}

.counter-matrix__cell {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.counter-matrix__cell[data-relation='strong'] {
  background: rgba(76, 200, 100, 0.2);
  color: var(--color-success, #4cc864);
  font-weight: 600;
}

.counter-matrix__cell[data-relation='weak'] {
  background: rgba(229, 76, 76, 0.2);
  color: var(--color-danger, #e54c4c);
}

.counter-matrix__cell:hover {
  background: var(--color-bg);
}

.counter-matrix__cell[data-relation='strong']:hover {
  background: rgba(76, 200, 100, 0.35);
}

.counter-matrix__cell[data-relation='weak']:hover {
  background: rgba(229, 76, 76, 0.35);
}

.counter-matrix__detail {
  font-size: 0.9em;
  color: var(--color-text-muted, var(--color-text));
  padding: var(--gap-sm);
  background: var(--color-bg);
  border-radius: calc(var(--radius) * 0.5);
}
</style>

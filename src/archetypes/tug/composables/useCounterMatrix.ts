import { computed, type ComputedRef } from 'vue';
import type { CounterMatrix, UnitDef } from '../data/types';
import { useTugData } from './useTugData';

export type CounterRelation = 'strong' | 'weak' | 'neutral';

export interface CounterMatrixView {
  /** Static unit roster — same order as the matrix's rows/columns. */
  units: ComputedRef<UnitDef[]>;
  /** The raw N×N matrix from data. */
  matrix: ComputedRef<CounterMatrix>;
  /** Index of an archetype id within `units` / `matrix`. -1 if unknown. */
  indexOf(archetypeId: string): number;
  /** Cell at (attacker, defender). 1.0 = neutral; >1 = strong; <1 = weak. */
  cellValue(attackerId: string, defenderId: string): number;
  /** Discrete relation classification for cell coloring. */
  cellRelation(attackerId: string, defenderId: string): CounterRelation;
  /** Top-N strongest counters (cellValue > 1) for an attacker. */
  topStrongCounters(attackerId: string, n?: number): UnitDef[];
}

/**
 * Pure-data counter-matrix view. Reads `data.counterMatrix` + the
 * archetype-id → matrix-index map; no engine inject (no module owns matrix
 * state — the data table is the source). Used by `CounterMatrixPanel.vue` for
 * the 6×6 grid and by `UnitShop.vue` for the per-card "strong vs X" hints.
 */
export function useCounterMatrix(): CounterMatrixView {
  const data = useTugData();

  const idxOf = computed(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < data.units.length; i++) m.set(data.units[i].id, i);
    return m;
  });

  function indexOf(id: string): number {
    return idxOf.value.get(id) ?? -1;
  }

  function cellValue(attackerId: string, defenderId: string): number {
    const a = indexOf(attackerId);
    const d = indexOf(defenderId);
    if (a < 0 || d < 0) return 1;
    return data.counterMatrix[a]?.[d] ?? 1;
  }

  function cellRelation(attackerId: string, defenderId: string): CounterRelation {
    const v = cellValue(attackerId, defenderId);
    if (v > 1) return 'strong';
    if (v < 1) return 'weak';
    return 'neutral';
  }

  function topStrongCounters(attackerId: string, n = 2): UnitDef[] {
    const a = indexOf(attackerId);
    if (a < 0) return [];
    const row = data.counterMatrix[a] ?? [];
    const ranked = data.units
      .map((def, i) => ({ def, value: row[i] ?? 1 }))
      .filter((entry) => entry.value > 1)
      .sort((x, y) => y.value - x.value)
      .slice(0, n)
      .map((entry) => entry.def);
    return ranked;
  }

  return {
    units: computed(() => data.units),
    matrix: computed(() => data.counterMatrix),
    indexOf,
    cellValue,
    cellRelation,
    topStrongCounters,
  };
}

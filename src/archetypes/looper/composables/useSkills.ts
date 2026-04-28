import { computed, inject, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type Engine } from 'open-loop-engine';
import type { SkillDef } from '../data/types';
import { SkillsKey } from '../modules';

export interface SkillRow {
  def: SkillDef;
  /** Gen-tier level (resets per loop). */
  genLevel: ComputedRef<DecimalSource>;
  /** Instinct-tier level (persists across loops). */
  instinctLevel: ComputedRef<DecimalSource>;
  /** Multiplicative multiplier from gen × instinct chain (apply(1)). */
  effectiveMultiplier: ComputedRef<DecimalSource>;
  /** Retention component only (instinct's contribution alone) — for the panel readout. */
  retentionMultiplier: ComputedRef<DecimalSource>;
}

export function useSkills(): ComputedRef<SkillRow[]> {
  const engine = inject<Engine>('engine');
  const skills = engine?.tryInject(SkillsKey);
  if (!skills) {
    throw new Error('useSkills() called outside an active looper engine');
  }

  return computed<SkillRow[]>(() => {
    const rows: SkillRow[] = [];
    for (const entry of skills.getAll()) {
      const state = entry.state;
      rows.push({
        def: entry.def,
        genLevel: computed(() => state.gen.level.value),
        instinctLevel: computed(() => state.instinct.level.value),
        effectiveMultiplier: computed(() => state.effectiveMultiplier.value),
        retentionMultiplier: computed(() => Decimal.div(state.instinct.modifier.apply(1), 1)),
      });
    }
    return rows;
  });
}

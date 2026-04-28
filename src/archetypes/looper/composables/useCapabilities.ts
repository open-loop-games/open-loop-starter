import { computed, inject, type ComputedRef } from 'vue';
import { type DecimalSource, type Engine } from 'open-loop-engine';
import type { CapabilityDef } from '../data/types';
import { CapabilitiesKey } from '../modules';

export interface CapabilityRow {
  def: CapabilityDef;
  /** Level-tier level (resets per loop). Drives within-loop cost reduction. */
  levelLevel: ComputedRef<DecimalSource>;
  /** Talent-tier level (persists across loops). Drives XP-rate compounding. */
  talentLevel: ComputedRef<DecimalSource>;
  /** Live Talent multiplier — `1 + sqrt(talentLevel) / 5`, vanilla canonical. */
  talentMultiplier: ComputedRef<DecimalSource>;
}

export function useCapabilities(): ComputedRef<CapabilityRow[]> {
  const engine = inject<Engine>('engine');
  const capabilities = engine?.tryInject(CapabilitiesKey);
  if (!capabilities) {
    throw new Error('useCapabilities() called outside an active looper engine');
  }

  return computed<CapabilityRow[]>(() => {
    const rows: CapabilityRow[] = [];
    for (const entry of capabilities.getAll()) {
      const state = entry.state;
      rows.push({
        def: entry.def,
        levelLevel: computed(() => state.level.level.value),
        talentLevel: computed(() => state.talent.level.value),
        talentMultiplier: computed(() => state.talentMult.value),
      });
    }
    return rows;
  });
}

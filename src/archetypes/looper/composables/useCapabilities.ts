import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { DecimalSource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { CapabilityDef } from '../data/types';
import { CapabilitiesKey } from '../modules';

export interface CapabilityRow {
  def: CapabilityDef;
  /** Level-tier level (resets per loop). Drives within-loop cost reduction. */
  levelLevel: ComputedRef<DecimalSource>;
  /** Level-tier raw XP. */
  levelXp: ComputedRef<DecimalSource>;
  /** Talent-tier level (persists across loops). Drives XP-rate compounding. */
  talentLevel: ComputedRef<DecimalSource>;
  /** Talent-tier raw XP. */
  talentXp: ComputedRef<DecimalSource>;
  /** Live Talent multiplier — `1 + sqrt(talentLevel) / 5`, vanilla canonical. */
  talentMultiplier: ComputedRef<DecimalSource>;
}

export function useCapabilities(): ComputedRef<CapabilityRow[]> {
  const capabilities = useModule(CapabilitiesKey);

  return computed<CapabilityRow[]>(() => {
    const rows: CapabilityRow[] = [];
    for (const entry of capabilities.getAll()) {
      const state = entry.state;
      rows.push({
        def: entry.def,
        levelLevel: computed(() => state.level.level.value),
        levelXp: computed(() => state.level.xp.value),
        talentLevel: computed(() => state.talent.level.value),
        talentXp: computed(() => state.talent.xp.value),
        talentMultiplier: computed(() => state.talentMult.value),
      });
    }
    return rows;
  });
}

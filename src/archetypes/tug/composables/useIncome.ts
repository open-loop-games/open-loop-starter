import { computed } from 'vue';
import type { ComputedRef, DecimalSource, Resource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { IncomeKey, type Side } from '../modules';

export interface IncomeRow {
  side: Side;
  resource: Resource<DecimalSource>;
  /** Convenience: resource value as a reactive computed for templates. */
  value: ComputedRef<DecimalSource>;
}

/**
 * Per-side mineral resource. Player consumes via the unit shop's cost
 * requirement; AI consumes via `opponent-bot.ts`. Both sides accrue inside
 * `income.ts` ticks; readers here just inject and surface the live ref.
 */
export function useIncome(side: Side): IncomeRow {
  const resource = useModule(IncomeKey[side]);
  return {
    side,
    resource,
    value: computed(() => resource.value),
  };
}

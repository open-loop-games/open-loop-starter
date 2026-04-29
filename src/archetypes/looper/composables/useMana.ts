import { computed } from 'vue';
import { Decimal, type ComputedRef, type DecimalSource, type Resource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { InitialManaKey, ManaKey, TotalManaBudgetKey } from '../modules';

export interface ManaView {
  /** Live mana value (ticks remaining in the loop). */
  mana: Resource<DecimalSource>;
  /** Pool size at loop start (ticks). Constant within a loop; tunable across loops. */
  initialMana: ComputedRef<DecimalSource>;
  /** `initialMana + manaAdded` — the total budget visible to the player this loop. */
  totalBudget: ComputedRef<DecimalSource>;
  /** Fraction of the *total budget* remaining, clamped 0..1. Drives the mana gauge. */
  fillRatio: ComputedRef<number>;
}

export function useMana(): ManaView {
  const mana = useModule(ManaKey);
  const initialMana = useModule(InitialManaKey);
  const totalBudget = useModule(TotalManaBudgetKey);

  const fillRatio = computed(() => {
    const max = totalBudget.value;
    if (Decimal.lte(max, 0)) return 0;
    const ratio = Decimal.div(mana.value, max).toNumber();
    return Math.max(0, Math.min(1, ratio));
  });

  return { mana, initialMana, totalBudget, fillRatio };
}

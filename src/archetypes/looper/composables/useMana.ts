import { computed, inject, type ComputedRef, type Ref } from 'vue';
import { Decimal, type DecimalSource, type Engine, type Resource } from 'open-loop-engine';
import { InitialManaKey, ManaKey, TotalManaBudgetKey } from '../modules';

export interface ManaView {
  /** Live mana value (ticks remaining in the loop). */
  mana: Resource<DecimalSource>;
  /** Pool size at loop start (ticks). Constant within a loop; tunable across loops. */
  initialMana: ComputedRef<DecimalSource>;
  /** `initialMana + manaAdded` — the total budget visible to the player this loop. */
  totalBudget: ComputedRef<DecimalSource>;
  /** Materialised ref so Vue templates render `{{ format(manaRef, 0) }}` correctly (Ref-brand peel). */
  manaRef: Ref<DecimalSource>;
  /** Fraction of the *total budget* remaining, clamped 0..1. Drives the mana gauge. */
  fillRatio: ComputedRef<number>;
}

export function useMana(): ManaView {
  const engine = inject<Engine>('engine');
  const mana = engine?.tryInject(ManaKey);
  const initialMana = engine?.tryInject(InitialManaKey);
  const totalBudget = engine?.tryInject(TotalManaBudgetKey);
  if (!mana || !initialMana || !totalBudget) {
    throw new Error('useMana() called outside an active looper engine');
  }

  // Materialise via a `computed(() => ref.value)` so the Vue template
  // type-checker peels Resource's Ref brand correctly. Direct
  // `{{ mana.value }}` evaluates undefined in templates because of the
  // brand mismatch.
  const manaRef = computed<DecimalSource>(() => mana.value) as unknown as Ref<DecimalSource>;

  const fillRatio = computed(() => {
    const max = totalBudget.value;
    if (Decimal.lte(max, 0)) return 0;
    const ratio = Decimal.div(mana.value, max).toNumber();
    return Math.max(0, Math.min(1, ratio));
  });

  return { mana, initialMana, totalBudget, manaRef, fillRatio };
}

import { computed, inject, type ComputedRef, type Ref } from 'vue';
import { Decimal, type DecimalSource, type Engine, type Resource } from 'open-loop-engine';
import { ManaKey, ManaPoolMaxKey } from '../modules';

export interface ManaView {
  /** Live mana value (sim-seconds remaining in the loop). */
  mana: Resource<DecimalSource>;
  /** Pool maximum at loop start (computed over `balance.timeResourcePoolBase`). */
  poolMax: ComputedRef<DecimalSource>;
  /** Materialised ref so Vue templates render `{{ format(manaRef, 0) }}` correctly (Ref-brand peel). */
  manaRef: Ref<DecimalSource>;
  /** Fraction of the pool remaining, clamped 0..1. Drives the mana gauge. */
  fillRatio: ComputedRef<number>;
}

export function useMana(): ManaView {
  const engine = inject<Engine>('engine');
  const mana = engine?.tryInject(ManaKey);
  const poolMax = engine?.tryInject(ManaPoolMaxKey);
  if (!mana || !poolMax) {
    throw new Error('useMana() called outside an active looper engine');
  }

  // Materialise via a `computed(() => ref.value)` so the Vue template
  // type-checker peels Resource's Ref brand correctly. Direct
  // `{{ mana.value }}` evaluates undefined in templates because of the
  // brand mismatch — see OL-697 / OL-698 carry-forward gotchas.
  const manaRef = computed<DecimalSource>(() => mana.value) as unknown as Ref<DecimalSource>;

  const fillRatio = computed(() => {
    const max = poolMax.value;
    if (Decimal.lte(max, 0)) return 0;
    const ratio = Decimal.div(mana.value, max).toNumber();
    return Math.max(0, Math.min(1, ratio));
  });

  return { mana, poolMax, manaRef, fillRatio };
}

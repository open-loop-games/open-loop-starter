import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface ProducerRowData<T = never> {
  id: string;
  displayName: string;
  count: Ref<DecimalSource>;
  /** What renders under "/s" on the row — typically total, not per-instance. */
  displayRate: Ref<DecimalSource>;
  /** Cost is parametric on count because producers are repeatable. */
  cost: (count: DecimalSource) => DecimalSource;
  /** Parametric for the same reason; e.g. canBuy(10) vs canBuy(1). */
  canBuy: (count: DecimalSource) => boolean;
  maxAffordable: Ref<DecimalSource>;
  buy: (count: DecimalSource) => void;
  unlocked?: Ref<boolean>;
  /**
   * Typed per-row payload forwarded to the `#row` slot. Together with the slot,
   * this is the composition's extension seam: a story that needs richer state
   * (engine refs, def, breakdown chains) or a shape the flat contract can't
   * hold — e.g. multi-resource costs — passes it here and reads it back typed
   * in the slot, instead of the core contract growing every consumer's needs.
   * Parameterize the component (`ProducerList<MyRow>`) to type it end-to-end;
   * the default template ignores it, so `T` defaults to `never`.
   */
  extra?: T;
}

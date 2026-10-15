import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface ProducerRowData<T = never> {
  id: string;
  displayName: string;
  count: Ref<DecimalSource>;
  /** What renders under "/s" on the row — typically total, not per-instance. Absent: no rate line. */
  displayRate?: Ref<DecimalSource>;
  /** Cost is parametric on count because producers are repeatable. Absent: no price. */
  cost?: (count: DecimalSource) => DecimalSource;
  /** This row's price unit; overrides the list's `costLabel`. */
  costLabel?: string;
  /** Parametric for the same reason; e.g. canPurchase(10) vs canPurchase(1). */
  canPurchase: (count: DecimalSource) => boolean;
  /** Units purchasable now. Absent: the row purchases one at a time. */
  maxAffordable?: Ref<DecimalSource>;
  purchase: (count: DecimalSource) => void;
  unlocked?: Ref<boolean>;
  /** Unmet prerequisites; while any are listed, their text replaces the purchase button. */
  unmet?: Ref<string[]>;
  /**
   * Typed per-row payload forwarded to the `#row` slot. Together with the slot,
   * this is the composition's extension seam: a story that needs richer state
   * (engine refs, def, breakdown chains) or a shape the flat contract can't
   * hold — e.g. multi-resource costs — passes it here and reads it back typed
   * in the slot, instead of the core contract growing every consumer's needs.
   * The `#row` slot receives the row type the list was given, so `extra` and
   * any field a row always carries read back typed, with no cast. The default
   * template ignores it, so `T` defaults to `never`.
   */
  extra?: T;
}

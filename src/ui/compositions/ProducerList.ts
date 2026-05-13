import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface ProducerRowData {
  id: string;
  name: string;
  count: Ref<DecimalSource>;
  /** What renders under "/s" on the row — typically total, not per-instance. */
  displayRate: Ref<DecimalSource>;
  /** Cost is parametric on amount because producers are repeatable. */
  cost: (amount: DecimalSource) => DecimalSource;
  /** Parametric for the same reason; e.g. canBuy(10) vs canBuy(1). */
  canBuy: (amount: DecimalSource) => boolean;
  maxAffordable: Ref<DecimalSource>;
  buy: (amount: DecimalSource) => void;
  unlocked?: Ref<boolean>;
  /**
   * Opaque per-row data forwarded to the `#row` slot. Lets archetypes attach
   * rich state (engine refs, def, breakdown chains) without a side-channel
   * map lookup. Default template ignores it.
   */
  extra?: unknown;
}

import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface UpgradeCardData<T = never> {
  id: string;
  displayName: string;
  /** A function is read at render, for text that changes; the `#card` slot gets the text as `description`. */
  description: string | (() => string);
  cost: Ref<DecimalSource>;
  costLabel: string;
  /** One-shot — non-parametric. Producers use the row-shape's parametric form. */
  canPurchase: Ref<boolean>;
  owned: Ref<boolean>;
  count?: Ref<DecimalSource>;
  formula?: () => string;
  purchase: () => void;
  position?: number;
  /** Absent or true: shown. False: filtered out, as `ProducerList` filters rows. */
  unlocked?: Ref<boolean>;
  /** Unmet prerequisites; while any are listed, their text replaces the purchase button. */
  unmet?: Ref<string[]>;
  /**
   * Typed per-card payload forwarded to the `#card` / `#reveal-content` slots —
   * the extension seam (see `ProducerRowData.extra`). The slots receive the card
   * type the grid was given, so `extra` and any field a card always carries read
   * back typed, with no cast. Defaults to `never`.
   */
  extra?: T;
}

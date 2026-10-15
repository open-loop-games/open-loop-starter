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

/** How an owned card is drawn; `removed` drops it from the grid. */
export type PurchasedState = 'greyed' | 'removed' | 'checkmark';

/**
 * The cards an `UpgradeGrid` shows: unlocked, and not owned when owned cards are removed.
 *
 * @param cards - the grid's cards.
 * @param purchasedState - the grid's `purchased-state`.
 * @returns the shown cards, in order.
 * @example
 * const wireOpen = computed(() => readShownCards(wireRoom, 'removed').length > 0);
 */
export function readShownCards<C extends UpgradeCardData<unknown>>(
  cards: readonly C[],
  purchasedState: PurchasedState = 'greyed',
): C[] {
  return cards.filter(
    (c) => (c.unlocked?.value ?? true) && !(c.owned.value && purchasedState === 'removed'),
  );
}

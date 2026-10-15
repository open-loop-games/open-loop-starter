import { computed } from 'vue';
import { Decimal, type Purchasable } from '@open-loop/engine';
import {
  createPurchasableCard,
  createPurchasableRow,
  type PurchasableRow,
} from '@/ui/compositions/purchasable';
import type { UpgradeCardData } from '@/ui/compositions/UpgradeGrid';
import { formatGrouped } from '@/composables/useFormatting';

/**
 * What an index card shows beyond the compositions' flat contract: the card's
 * own copy, its price in the currency it is paid in, and whether the clerks
 * buy it for you. Read back typed in the `#row` / `#card` slot.
 */
export interface CardExtra {
  title: () => string;
  description: () => string;
  price: () => string;
  owned?: () => string | undefined;
  automated?: () => boolean;
}

interface CardCopy {
  title: string | (() => string);
  description: string | (() => string);
  unit: string;
  owned?: () => string | undefined;
  automated?: () => boolean;
}

const read = (s: string | (() => string)) => (typeof s === 'string' ? () => s : s);

function extra(p: Purchasable, copy: CardCopy): CardExtra {
  return {
    title: read(copy.title),
    description: read(copy.description),
    price: () => `${formatGrouped(new Decimal(p.getCost(1)).ceil())} ${copy.unit}`,
    owned: copy.owned,
    automated: copy.automated,
  };
}

/** A repeatable purchase as a `ProducerList` row, bought one at a time. */
export function cardRow(id: string, p: Purchasable, copy: CardCopy): PurchasableRow<CardExtra> {
  return createPurchasableRow(p, {
    id,
    displayName: typeof copy.title === 'string' ? copy.title : id,
    // A maxed purchase leaves the desk rather than staying on as owned.
    unlocked: computed(() => p.visible.value && !p.maxed.value),
    extra: extra(p, copy),
  });
}

/** A one-shot purchase as an `UpgradeGrid` card. */
export function cardOnce(id: string, p: Purchasable, copy: CardCopy): UpgradeCardData<CardExtra> {
  return createPurchasableCard(p, {
    id,
    displayName: typeof copy.title === 'string' ? copy.title : id,
    description: read(copy.description),
    extra: extra(p, copy),
  });
}

import { computed } from 'vue';
import { Decimal, type Purchasable } from '@open-loop/engine';
import type { ProducerRowData } from '@/ui/compositions/ProducerList';
import type { UpgradeCardData } from '@/ui/compositions/UpgradeGrid';
import { whole } from './format';

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
    price: () => `${whole(new Decimal(p.getCost(1)).ceil())} ${copy.unit}`,
    owned: copy.owned,
    automated: copy.automated,
  };
}

/** A repeatable purchase as a `ProducerList` row, bought one at a time. */
export function cardRow(id: string, p: Purchasable, copy: CardCopy): ProducerRowData<CardExtra> {
  return {
    id,
    displayName: typeof copy.title === 'string' ? copy.title : id,
    count: p.count,
    displayRate: computed(() => 0),
    cost: () => p.getCost(1),
    canPurchase: () => p.canPurchase.value,
    maxAffordable: computed(() => (p.canPurchase.value ? 1 : 0)),
    purchase: () => void p.purchase(1),
    unlocked: computed(() => p.visible.value && !p.maxed.value),
    extra: extra(p, copy),
  };
}

/** A one-shot purchase as an `UpgradeGrid` card. */
export function cardOnce(id: string, p: Purchasable, copy: CardCopy): UpgradeCardData<CardExtra> {
  return {
    id,
    displayName: typeof copy.title === 'string' ? copy.title : id,
    description: read(copy.description),
    cost: computed(() => p.getCost(1)),
    costLabel: copy.unit,
    canPurchase: p.canPurchase,
    owned: p.active,
    purchase: () => void p.purchase(1),
    extra: extra(p, copy),
  };
}

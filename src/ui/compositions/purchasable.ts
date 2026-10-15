import {
  Decimal,
  getRequirementDescriptions,
  isCostRequirement,
  maxRequirementsMet,
  requirementsMet,
  type CostRequirement,
  type DecimalSource,
  type Producer,
  type Purchasable,
  type Requirement,
  type Resource,
} from '@open-loop/engine';
import { computed, unref, type Ref } from 'vue';
import type { ProducerRowData } from './ProducerList';
import type { UpgradeCardData } from './UpgradeGrid';

/** One resource's share of a price. */
export interface PriceLine {
  resource: Resource;
  amount: DecimalSource;
  /** The resource holds less than `amount`. */
  short: boolean;
}

function requirementsOf(p: Purchasable): Requirement[] {
  return Array.isArray(p.requirements) ? p.requirements : [p.requirements];
}

function costsOf(p: Purchasable): CostRequirement[] {
  return requirementsOf(p).filter(isCostRequirement);
}

/** One line per cost requirement; the engine prices the next `count` units. */
export function readPriceLines(p: Purchasable, count: DecimalSource = 1): PriceLine[] {
  return costsOf(p).map((req) => {
    const amount = req.getCost(count);
    return { resource: req.resource, amount, short: Decimal.lt(req.resource.value, amount) };
  });
}

/** Units purchasable now: 0 when none, capped by the limit (unlike `countToPurchase`). */
export function readMaxAffordable(p: Purchasable): DecimalSource {
  if (!p.canPurchase.value) return 0;
  return maxRequirementsMet(p.requirements);
}

/** Descriptions of the unmet requirements that are not costs. */
export function readUnmet(p: Purchasable): string[] {
  const unmet = requirementsOf(p).filter((r) => !isCostRequirement(r) && !requirementsMet(r));
  return getRequirementDescriptions(unmet);
}

/** A row the adapter built: it always knows the purchasable's max and its unmet prerequisites. */
export type PurchasableRow<T = never> = ProducerRowData<T> & {
  maxAffordable: Ref<DecimalSource>;
  unmet: Ref<string[]>;
};

/** A producer's row: one resource pays for a producer, so it always has a price, and it shows the stack's rate. */
export type ProducerRow<T = never> = PurchasableRow<T> & {
  displayRate: Ref<DecimalSource>;
  cost: (count: DecimalSource) => DecimalSource;
  costLabel: string;
};

/** What a story supplies beside the purchasable; every field but the name has an engine default. */
export interface PurchasableRowOptions<T = never> {
  displayName: string;
  /** Default: the purchasable's id. */
  id?: string;
  extra?: T;
  /** Default: the purchase count. */
  count?: Ref<DecimalSource>;
  /** Default: none, so the row shows no rate. */
  rate?: Ref<DecimalSource>;
  /** Default: the purchasable's visibility. */
  unlocked?: Ref<boolean>;
  /** A story verb with side effects. Default: the purchasable's own purchase. */
  purchase?: (count: DecimalSource) => void;
}

/**
 * A `ProducerList` row over one engine purchasable.
 *
 * @param p - the purchasable the row sells.
 * @param o - the row's name, and any field the engine default gets wrong for the story.
 * @returns the row. Its price is the engine's when one resource pays; with several,
 *   the row has none and the story renders `readPriceLines` from `extra`.
 * @example
 * const rows = MILLS.map((def) => createPurchasableRow(mills.getPurchasable(def.id)!, { displayName: def.name }));
 */
export function createPurchasableRow<T = never>(
  p: Purchasable,
  o: PurchasableRowOptions<T> & { rate: Ref<DecimalSource> },
): PurchasableRow<T> & { displayRate: Ref<DecimalSource> };
export function createPurchasableRow<T = never>(
  p: Purchasable,
  o: PurchasableRowOptions<T>,
): PurchasableRow<T>;
export function createPurchasableRow<T = never>(
  p: Purchasable,
  o: PurchasableRowOptions<T>,
): PurchasableRow<T> {
  const costs = costsOf(p);
  const single = costs.length === 1 ? costs[0] : undefined;
  const maxAffordable = computed(() => readMaxAffordable(p));
  const row: PurchasableRow<T> = {
    id: o.id ?? p.id,
    displayName: o.displayName,
    count: o.count ?? p.count,
    canPurchase: (n) => p.canPurchase.value && Decimal.gte(maxAffordable.value, n),
    maxAffordable,
    purchase: o.purchase ?? ((n) => void p.purchase(n)),
    unlocked: o.unlocked ?? p.visible,
    unmet: computed(() => readUnmet(p)),
  };
  if (single) {
    row.cost = (n) => single.getCost(n);
    row.costLabel = single.resource.displayName;
  }
  if (o.rate) row.displayRate = o.rate;
  if (o.extra !== undefined) row.extra = o.extra;
  return row;
}

/**
 * A `ProducerList` row over one engine producer.
 *
 * @param pr - a producer registered with a `purchase`.
 * @param o - as for `createPurchasableRow`. `count` defaults to the owned count, and
 *   `rate` to the stack's total: the per-unit rate times the producing count.
 * @returns the row.
 * @example
 * const rows = BUILDINGS.map((def) => createProducerRow(buildings.getProducer(def.id)!, { displayName: def.name }));
 */
export function createProducerRow<T = never>(
  pr: Producer,
  o: PurchasableRowOptions<T>,
): ProducerRow<T> {
  if (!pr.repeatable) throw new Error(`[createProducerRow] producer '${pr.id}' has no purchase`);
  const row = createPurchasableRow(pr.repeatable, { ...o, count: o.count ?? pr.ownedCount });
  const { cost, costLabel } = row;
  if (!cost || costLabel === undefined) {
    throw new Error(`[createProducerRow] producer '${pr.id}' is not priced in one resource`);
  }
  const displayRate = o.rate ?? computed(() => Decimal.mul(pr.computedRate.value, pr.count.value));
  return { ...row, cost, costLabel, displayRate };
}

/**
 * An `UpgradeGrid` card over one engine purchasable, usually a one-shot.
 *
 * @param p - the purchasable the card sells.
 * @param o - as for `createPurchasableRow`, plus a description; default: the purchasable's own.
 * @returns the card. It is owned once the purchasable is maxed, and its price is the
 *   engine's for one unit when one resource pays.
 * @example
 * const cards = UPGRADES.map((def) => createPurchasableCard(upgrades.getPurchasable(def.id)!, { displayName: def.name }));
 */
export function createPurchasableCard<T = never>(
  p: Purchasable,
  o: Omit<PurchasableRowOptions<T>, 'rate'> & { description?: string | (() => string) },
): UpgradeCardData<T> {
  const costs = costsOf(p);
  const single = costs.length === 1 ? costs[0] : undefined;
  const card: UpgradeCardData<T> = {
    id: o.id ?? p.id,
    displayName: o.displayName,
    description: o.description ?? (() => unref(p.display.description)),
    cost: computed(() => (single ? single.getCost(1) : 0)),
    costLabel: single?.resource.displayName ?? '',
    canPurchase: p.canPurchase,
    owned: p.maxed,
    purchase: () => (o.purchase ? o.purchase(1) : void p.purchase(1)),
    unlocked: o.unlocked ?? p.visible,
    unmet: computed(() => readUnmet(p)),
  };
  if (o.count) card.count = o.count;
  if (o.extra !== undefined) card.extra = o.extra;
  return card;
}

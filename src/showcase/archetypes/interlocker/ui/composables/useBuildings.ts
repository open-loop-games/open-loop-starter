import { computed, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import { getBuildings, getResources } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { BuildingPrice, BuildingSpec } from '../../data/types';

export interface BuildingCostLine {
  resource: BuildingPrice['resource'];
  /** Resource display label. */
  resourceName: string;
  /** Cost for the bulk amount being evaluated. */
  amount: ComputedRef<DecimalSource>;
  /** Current wallet balance of this resource. */
  have: ComputedRef<DecimalSource>;
  /** Whether the wallet currently holds enough. */
  satisfied: ComputedRef<boolean>;
}

export interface BuildingRow {
  id: BuildingSpec['id'];
  name: string;
  def: BuildingSpec;
  count: ComputedRef<number>;
  visible: ComputedRef<boolean>;
  canBuy: ComputedRef<boolean>;
  /** Multi-resource cost breakdown for the *current* bulk amount. */
  costs: ComputedRef<BuildingCostLine[]>;
  grants: BuildingSpec['grants'];
  buy(amount: DecimalSource): void;
}

/**
 * Row data for the buildings panel.
 *
 * `Purchasable.getCost(amount)` collapses multi-resource costs to a single
 * `DecimalSource`, so the panel computes per-resource costs directly from the
 * spec (`baseCost × priceRatio^count`). The engine's own `canPurchase`
 * predicate still drives the buy gate — it evaluates every CostRequirement.
 *
 * TODO(expansion): multi-resource cost preview. First consumer of this shape
 * in the corpus. Future Factorio-likes / Mindustry-likes / Director archetype
 * would converge — promote into @/ui/compositions/ when N=2 lands.
 */
export function useBuildings(bulkAmount: () => DecimalSource): BuildingRow[] {
  const buildings = getBuildings();
  const resources = getResources();
  const data = DEFAULT_INTERLOCKER_DATA;
  const resourceNameById = new Map(data.resources.map((r) => [r.id, r.name]));

  return data.buildings.map<BuildingRow>((def) => {
    const count = computed(() => buildings.buildingCount(def.id));
    const visible = computed(() => buildings.isVisible(def.id));

    const entry = computed(() => buildings.category.getEntry(def.id));

    const costs = computed<BuildingCostLine[]>(() => {
      const amount = bulkAmount();
      // Bulk pricing: sum the next N geometric terms.
      // cost_total(amount) = baseCost × ratio^count × (ratio^amount - 1) / (ratio - 1)
      //                     for ratio != 1; baseCost × amount when ratio == 1.
      const n = Decimal.fromValue(amount);
      const exp = def.priceRatio;
      const c = count.value;
      return def.prices.map((price) =>
        buildCostLine(price, exp, c, n, resources, resourceNameById),
      );
    });

    const canBuy = computed(() => entry.value?.purchasable.canPurchase.value ?? false);

    function buy(amount: DecimalSource): void {
      const p = entry.value?.purchasable;
      if (!p) return;
      p.purchase(amount);
    }

    return {
      id: def.id,
      name: def.name,
      def,
      count,
      visible,
      canBuy,
      costs,
      grants: def.grants,
      buy,
    };
  });
}

function buildCostLine(
  price: BuildingPrice,
  ratio: number,
  count: number,
  bulk: Decimal,
  resources: ReturnType<typeof getResources>,
  nameById: Map<string, string>,
): BuildingCostLine {
  const amount = computed<DecimalSource>(() => {
    const single = Decimal.mul(price.baseCost, Decimal.pow(ratio, count));
    if (ratio === 1) return Decimal.mul(single, bulk);
    // Sum of next-N geometric terms starting at exponent `count`.
    const num = Decimal.sub(Decimal.pow(ratio, bulk), 1);
    const den = ratio - 1;
    return Decimal.mul(single, Decimal.div(num, den));
  });
  const have = computed<DecimalSource>(() => resources.resources[price.resource].value);
  const satisfied = computed(() => Decimal.gte(have.value, amount.value));
  return {
    resource: price.resource,
    resourceName: nameById.get(price.resource) ?? price.resource,
    amount,
    have,
    satisfied,
  };
}

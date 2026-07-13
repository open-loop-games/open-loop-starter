import { computed, type ComputedRef } from 'vue';
import { Decimal, isCostRequirement, type DecimalSource } from '@open-loop/engine';
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
  /** Whether this building is a continuous consumer (drains inputs every tick).
   *  Such buildings expose the canon active-count throttle. Arc-1's only one is
   *  the smelter. */
  continuous: boolean;
  /** Active ("on") count — how many of `count` are currently running. */
  activeCount: ComputedRef<number>;
  /** Set the active count (canon pause/throttle). Overridden by the automation
   *  when the building's automation is enabled. */
  setActive(n: number): void;
}

/**
 * Row data for the buildings panel.
 *
 * Per-resource bulk cost reads each price line's own `CostRequirement.getCost`
 * off the live purchasable — `buildings.ts` builds those requirements as
 * `Formula.exponential`, so `getCost(amount)` is the engine's closed-form
 * compounding geometric sum, not a hand-rolled re-derivation. The engine's own
 * `canPurchase` predicate drives the buy gate — it evaluates every
 * CostRequirement.
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

    const costs = computed<BuildingCostLine[]>(() =>
      def.prices.map((price) =>
        buildCostLine(price, entry, bulkAmount, resources, resourceNameById),
      ),
    );

    const canBuy = computed(() => entry.value?.purchasable.canPurchase.value ?? false);

    function buy(amount: DecimalSource): void {
      const p = entry.value?.purchasable;
      if (!p) return;
      p.purchase(amount);
    }

    // Arc-1's only continuous consumer is the smelter (drains wood + minerals
    // per tick). Generalize this flag when a second continuous building lands.
    const continuous = def.id === 'smelter';
    const activeCount = computed(() => buildings.activeCount(def.id));
    function setActive(n: number): void {
      buildings.setActiveCount(def.id, n);
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
      continuous,
      activeCount,
      setActive,
    };
  });
}

function buildCostLine(
  price: BuildingPrice,
  entry: ComputedRef<ReturnType<ReturnType<typeof getBuildings>['category']['getEntry']>>,
  bulkAmount: () => DecimalSource,
  resources: ReturnType<typeof getResources>,
  nameById: Map<string, string>,
): BuildingCostLine {
  const resource = resources.resources[price.resource];
  const amount = computed<DecimalSource>(() => {
    const reqs = entry.value?.purchasable.requirements;
    const list = reqs == null ? [] : Array.isArray(reqs) ? reqs : [reqs];
    const req = list.find((r) => isCostRequirement(r) && r.resource === resource);
    return req && isCostRequirement(req) ? req.getCost(bulkAmount()) : Decimal.dZero;
  });
  const have = computed<DecimalSource>(() => resource.value);
  const satisfied = computed(() => Decimal.gte(have.value, amount.value));
  return {
    resource: price.resource,
    resourceName: nameById.get(price.resource) ?? price.resource,
    amount,
    have,
    satisfied,
  };
}

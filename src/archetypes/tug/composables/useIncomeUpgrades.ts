import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { IncomeUpgradeDef } from '../data/types';
import { IncomeUpgradesKey, IncomeUpgradeRoiKey, type Side } from '../modules';
import { useTugData } from './useTugData';

export interface IncomeUpgradeRow {
  def: IncomeUpgradeDef;
  /** Underlying engine purchasable. `purchase()` flips `bought`, applies
   *  the multiplicative grant onto the side's `incomeRateChain`. */
  purchasable: Purchasable;
  /** True once this tier has been bought. The grant stays applied while
   *  bought; reset wipes it at match boundary. */
  bought: ComputedRef<boolean>;
  /** True when both cost requirement AND sequential gate (prior tier
   *  bought) are satisfied. Sequential gating prevents tier-3 buying
   *  while tier-2 is unavailable, even if income happens to suffice. */
  canPurchase: ComputedRef<boolean>;
  /** Cost of the next purchase, in resource units. Reactive against the
   *  tunable wrap (when applicable) — leaf-6 scope-pushes propagate. */
  cost: ComputedRef<number>;
  /** Time after purchase for the extra income to recoup the cost, in
   *  seconds. Mirrors producer's `purchaseBeatSeconds` vocabulary
   *  ("Pays off in 40s"). Sourced from `IncomeUpgradeRoiKey`. */
  paybackSeconds: ComputedRef<number>;
  /** Total elapsed time until the eco-then-rush strategy catches a
   *  pure-rush strategy in cumulative spendable, in seconds. The
   *  strategically meaningful break-even ("Catches rush at 60s").
   *  Sourced from `IncomeUpgradeRoiKey`. */
  crossoverSeconds: ComputedRef<number>;
  /** Buy this tier. Engine no-ops when `canPurchase` is false; UI uses
   *  the disabled state to avoid the click. */
  buy(): void;
}

export interface IncomeUpgradesView {
  side: Side;
  rows: ComputedRef<IncomeUpgradeRow[]>;
}

/**
 * Per-side income-upgrade shop view. Mirrors `useUnits` shape so the
 * IncomeBar panel can render upgrade tiles in the same disabled / ready
 * / bought state machine as unit cards. Sequential gating is encoded in
 * the engine's purchasable requirement; UI only consumes `canPurchase`.
 */
export function useIncomeUpgrades(side: Side): IncomeUpgradesView {
  const shop = useModule(IncomeUpgradesKey[side]);
  const roi = useModule(IncomeUpgradeRoiKey[side]);
  const data = useTugData();

  const rows = computed<IncomeUpgradeRow[]>(() => {
    const out: IncomeUpgradeRow[] = [];
    for (const def of data.incomeUpgrades) {
      const purchasable = shop.getPurchasable(def.id);
      const metrics = roi.get(def.id);
      if (!purchasable || !metrics) continue;
      out.push({
        def,
        purchasable,
        bought: computed(() => purchasable.bought.value),
        canPurchase: computed(() => purchasable.canPurchase.value),
        cost: computed(() => Number(purchasable.getCost(1))),
        paybackSeconds: metrics.paybackSeconds,
        crossoverSeconds: metrics.crossoverSeconds,
        buy: () => {
          purchasable.purchase(1);
        },
      });
    }
    return out;
  });

  return { side, rows };
}

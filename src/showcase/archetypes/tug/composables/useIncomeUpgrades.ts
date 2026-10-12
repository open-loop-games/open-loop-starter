import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Purchasable } from '@open-loop/engine';
import { useModule } from '@/composables/useModule';
import type { IncomeUpgradeDef } from '../data/types';
import { getIncomeUpgrades, IncomeUpgradeRoiKey, TugDataKey, type Side } from '../modules';

export interface IncomeUpgradeRow {
  def: IncomeUpgradeDef;
  /** Underlying engine purchasable. `purchase()` flips `purchased`, applies
   *  the multiplicative grant onto the side's `incomeRateChain`. */
  purchasable: Purchasable;
  /** True once this tier has been purchased. The grant stays applied while
   *  purchased; reset wipes it at match boundary. */
  purchased: ComputedRef<boolean>;
  /** True when both the cost and the sequential order (prior tier
   *  purchased) are satisfied. The order blocks a tier-3 purchase
   *  while tier-2 is unavailable, even if income happens to suffice. */
  canPurchase: ComputedRef<boolean>;
  /** Cost of the next purchase, in resource units. Reactive against the
   *  tunable wrap (when applicable) — leaf-6 scope-pushes propagate. */
  cost: ComputedRef<number>;
  /** Time after purchase for the extra income to recoup the cost, in
   *  seconds: the payback period ("Pays off in 40s"). Sourced from `IncomeUpgradeRoiKey`. */
  paybackSeconds: ComputedRef<number>;
  /** Game time until the eco-then-rush policy catches a
   *  pure-rush policy in cumulative spendable, in seconds. The
   *  strategically meaningful break-even ("Catches rush at 60s").
   *  Sourced from `IncomeUpgradeRoiKey`. */
  crossoverSeconds: ComputedRef<number>;
  /** Purchase this tier. Engine no-ops when `canPurchase` is false; UI uses
   *  the disabled state to avoid the click. */
  purchase(): void;
}

export interface IncomeUpgradesView {
  side: Side;
  rows: ComputedRef<IncomeUpgradeRow[]>;
}

/**
 * Per-side income-upgrade shop view. Mirrors `useUnits` shape so the
 * IncomeBar panel can render upgrade tiles in the same disabled / ready
 * / purchased state machine as unit cards. The sequential order is encoded in
 * the engine's purchasable requirement; UI only consumes `canPurchase`.
 */
export function useIncomeUpgrades(side: Side): IncomeUpgradesView {
  const shop = getIncomeUpgrades(side);
  const roi = useModule(IncomeUpgradeRoiKey[side]);
  const data = useModule(TugDataKey);

  const rows = computed<IncomeUpgradeRow[]>(() => {
    const out: IncomeUpgradeRow[] = [];
    for (const def of data.incomeUpgrades) {
      const purchasable = shop.getPurchasable(def.id);
      const metrics = roi.get(def.id);
      if (!purchasable || !metrics) continue;
      out.push({
        def,
        purchasable,
        purchased: computed(() => purchasable.active.value),
        canPurchase: computed(() => purchasable.canPurchase.value),
        cost: computed(() => Number(purchasable.getCost(1))),
        paybackSeconds: metrics.paybackSeconds,
        crossoverSeconds: metrics.crossoverSeconds,
        purchase: () => {
          purchasable.purchase(1);
        },
      });
    }
    return out;
  });

  return { side, rows };
}

import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { InjectionKey, Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { UpgradeRoster } from '../modules';

// TODO(expansion): producer/composables/useUpgrades.ts has additional
// per-producer/global/click grouping; scaler upgrades are flat per category.
// Graduate to a shared composable when a third archetype matches either
// shape.

export interface UpgradeRow<Def> {
  def: Def;
  bought: ComputedRef<boolean>;
  canPurchase: ComputedRef<boolean>;
  purchase: () => void;
  purchasable: Purchasable;
}

/**
 * Flat reactive rows for every upgrade in the given roster. Scaler rosters
 * (CrystalUpgrades, TranscendUpgrades) wrap per-def Purchasables in a
 * createPurchasableGroup with a side-table of `{ def, purchasable }` entries
 * — the per-def post-creation chain.bind closures don't fit
 * createPurchasableCategory's mapPurchasable shape.
 */
export function useUpgrades<Def extends { id: string }>(
  rosterKey: InjectionKey<UpgradeRoster<Def>>,
): ComputedRef<UpgradeRow<Def>[]> {
  const roster = useModule(rosterKey);

  return computed(() =>
    roster.entries.map((entry) => ({
      def: entry.def,
      bought: entry.purchasable.active,
      canPurchase: entry.purchasable.canPurchase,
      purchase: () => {
        entry.purchasable.purchase();
      },
      purchasable: entry.purchasable,
    })),
  );
}

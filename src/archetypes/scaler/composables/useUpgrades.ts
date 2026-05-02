import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { InjectionKey, Purchasable, PurchasableCategory } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';

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
 * Flat reactive rows for every upgrade in the given category. Scaler
 * categories (CrystalUpgrades, TranscendUpgrades) don't need the
 * per-producer / global / click split that the producer archetype's
 * shape carries — every entry is rendered uniformly per tier.
 */
export function useUpgrades<Def extends { id: string }>(
  categoryKey: InjectionKey<PurchasableCategory<Def>>,
): ComputedRef<UpgradeRow<Def>[]> {
  const category = useModule(categoryKey);

  return computed(() =>
    category.getAll().map((entry) => ({
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

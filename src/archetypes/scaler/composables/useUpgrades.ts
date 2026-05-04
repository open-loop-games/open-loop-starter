import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Purchasable, PurchasableCategory } from 'open-loop-engine';

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
 * Flat reactive rows for every upgrade in a PurchasableCategory.
 * Takes the category instance directly rather than an InjectionKey —
 * scaler tier APIs expose categories as fields on the bundle.
 */
export function useUpgrades<Def extends { id: string }>(
  category: PurchasableCategory<Def>,
): ComputedRef<UpgradeRow<Def>[]> {
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

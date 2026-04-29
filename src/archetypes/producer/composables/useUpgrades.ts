import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { UpgradeDef } from '../data/types';
import { UpgradesKey } from '../modules';

export interface UpgradeRow {
  def: UpgradeDef;
  bought: ComputedRef<boolean>;
  canPurchase: ComputedRef<boolean>;
  purchase: () => void;
  purchasable: Purchasable;
}

export interface UpgradeGroups {
  perProducer: Map<string, UpgradeRow[]>;
  global: UpgradeRow[];
  click: UpgradeRow[];
}

/** Grouped upgrade rows — per-producer upgrades keyed by producer id,
 *  plus click-targeted and global groups. */
export function useUpgrades(): ComputedRef<UpgradeGroups> {
  const upgrades = useModule(UpgradesKey);

  return computed(() => {
    const perProducer = new Map<string, UpgradeRow[]>();
    const global: UpgradeRow[] = [];
    const click: UpgradeRow[] = [];

    for (const entry of upgrades.getAll()) {
      const row: UpgradeRow = {
        def: entry.def,
        bought: entry.purchasable.active,
        canPurchase: entry.purchasable.canPurchase,
        purchase: () => {
          entry.purchasable.purchase();
        },
        purchasable: entry.purchasable,
      };
      if (entry.def.targetProducerId === null) {
        global.push(row);
      } else if (entry.def.targetProducerId === 'click') {
        click.push(row);
      } else {
        const bucket = perProducer.get(entry.def.targetProducerId) ?? [];
        bucket.push(row);
        perProducer.set(entry.def.targetProducerId, bucket);
      }
    }

    return { perProducer, global, click };
  });
}

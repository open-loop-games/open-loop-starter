import { computed, inject, type ComputedRef } from 'vue';
import type { Engine, Purchasable } from 'open-loop-engine';
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
  const engine = inject<Engine>('engine');
  const upgrades = engine?.tryInject(UpgradesKey);
  if (!upgrades) {
    throw new Error('useUpgrades() called outside an active producer engine');
  }

  return computed(() => {
    const perProducer = new Map<string, UpgradeRow[]>();
    const global: UpgradeRow[] = [];
    const click: UpgradeRow[] = [];

    for (const entry of upgrades.getAll()) {
      const row: UpgradeRow = {
        def: entry.def,
        bought: entry.purchasable.bought as unknown as ComputedRef<boolean>,
        canPurchase: entry.purchasable.canPurchase as unknown as ComputedRef<boolean>,
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

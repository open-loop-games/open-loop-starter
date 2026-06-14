import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Purchasable } from '@open-loop/engine';
import type { UpgradeDef } from '../data/types';
import { CLICK_PRODUCER_ID } from '../data/producers';
import { getUpgrades } from '../modules';

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

/**
 * Group an UpgradeDef into one of the three visible buckets. Declared
 * layout decision: `multiplier` upgrades binding to `['click', 'cursor']`
 * (cursor tier upgrades) surface in the **click** bucket as part of the
 * "Hand Tools" section — the canonical Cookie Clicker upgrade tray groups
 * these alongside cursor under the same row block, and click is the player-
 * facing identity of the upgrade. Cross-building click bonuses (Thousand
 * fingers) also land in click because their additive effect binds on the
 * click producer's rate chain.
 */
function bucketFor(def: UpgradeDef): { kind: 'click' | 'global' | 'per'; id?: string } {
  if (def.kind === 'cross-building-click-bonus') return { kind: 'click' };
  if (def.targetProducerId === null) return { kind: 'global' };
  if (Array.isArray(def.targetProducerId)) {
    return def.targetProducerId.includes(CLICK_PRODUCER_ID)
      ? { kind: 'click' }
      : { kind: 'per', id: def.targetProducerId[0] };
  }
  if (def.targetProducerId === CLICK_PRODUCER_ID) return { kind: 'click' };
  return { kind: 'per', id: def.targetProducerId };
}

/** Grouped upgrade rows — per-producer upgrades keyed by producer id,
 *  plus click-targeted and global groups. */
export function useUpgrades(): ComputedRef<UpgradeGroups> {
  const upgrades = getUpgrades();

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
      const bucket = bucketFor(entry.def);
      if (bucket.kind === 'click') {
        click.push(row);
      } else if (bucket.kind === 'global') {
        global.push(row);
      } else if (bucket.id) {
        const list = perProducer.get(bucket.id) ?? [];
        list.push(row);
        perProducer.set(bucket.id, list);
      }
    }

    return { perProducer, global, click };
  });
}

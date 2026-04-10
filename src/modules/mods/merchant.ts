/**
 * Merchant's Ledger mod — adds an Inventory of trinkets plus a buy/sell
 * trading system, and swaps the game layout to a ledger-style UI.
 *
 * Demonstrates:
 *   - createInventory with limited capacity
 *   - per-item trade prices
 *   - mod replacing the `game-layout` UI slot wholesale
 */
import {
  Decimal,
  createInventory,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Inventory,
} from 'open-loop-engine';
import { coreState } from '@/modules/core';
import { setSlot } from '@/modules/ui-registry';
import LedgerLayout from '@/ui/layouts/LedgerLayout.vue';
import LedgerPanel from '@/ui/panels/LedgerPanel.vue';

export interface TrinketDef {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
}

export const TRINKETS: TrinketDef[] = [
  { id: 'feather', name: 'Feather', buyPrice: 2, sellPrice: 3 },
  { id: 'gem', name: 'Gem', buyPrice: 8, sellPrice: 12 },
  { id: 'relic', name: 'Relic', buyPrice: 25, sellPrice: 40 },
];

export interface MerchantState {
  inventory: Inventory;
  trinkets: TrinketDef[];
  buy: (id: string) => boolean;
  sell: (id: string) => boolean;
}

export let merchantState: MerchantState | null = null;

export const merchantModule: EngineModule = {
  id: 'merchant',
  dependencies: ['core', 'loop'],
  install(_ctx: EngineContext) {
    const core = coreState!;

    beginPersistentContext('merchant-inventory');
    const inventory = createInventory({
      id: 'trinkets',
      displayName: 'Trinkets',
      baseCapacity: 20,
      items: TRINKETS.map((t) => t.id),
      overflow: 'block',
    });
    endPersistentContext();

    function buy(id: string): boolean {
      const def = TRINKETS.find((t) => t.id === id);
      if (!def) return false;
      const price = new Decimal(def.buyPrice);
      if (Decimal.lt(core.resources.gold.value, price)) return false;
      if (!inventory.canFit(id, 1)) return false;
      core.resources.gold.value = Decimal.sub(core.resources.gold.value, price);
      inventory.add(id, 1);
      return true;
    }

    function sell(id: string): boolean {
      const def = TRINKETS.find((t) => t.id === id);
      if (!def) return false;
      if (!inventory.has(id, 1)) return false;
      inventory.remove(id, 1);
      core.resources.gold.value = Decimal.add(
        core.resources.gold.value,
        new Decimal(def.sellPrice),
      );
      return true;
    }

    merchantState = { inventory, trinkets: TRINKETS, buy, sell };

    setSlot('ledger-panel', LedgerPanel);
    setSlot('game-layout', LedgerLayout);
  },
};

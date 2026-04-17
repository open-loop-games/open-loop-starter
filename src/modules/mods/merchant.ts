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
  createInventory,
  addResource,
  subtractResource,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Inventory,
} from 'open-loop-engine';
import { GatheringKey } from '@/modules/village-gatherer/gathering';
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

export const MerchantKey: InjectionKey<MerchantState> = Symbol('merchant') as InjectionKey<MerchantState>;

export const merchantModule: EngineModule = {
  id: 'merchant',
  dependencies: ['gathering', 'loop'],
  install(ctx: EngineContext) {
    const g = ctx.inject(GatheringKey);

    const inventory = createInventory({
      id: 'trinkets',
      displayName: 'Trinkets',
      baseCapacity: 20,
      items: TRINKETS.map((t) => t.id),
      overflow: 'block',
    });

    function buy(id: string): boolean {
      const def = TRINKETS.find((t) => t.id === id);
      if (!def) return false;
      if (!inventory.canFit(id, 1)) return false;
      if (!subtractResource(g.resources.gold, def.buyPrice)) return false;
      inventory.add(id, 1);
      return true;
    }

    function sell(id: string): boolean {
      const def = TRINKETS.find((t) => t.id === id);
      if (!def) return false;
      if (!inventory.has(id, 1)) return false;
      inventory.remove(id, 1);
      addResource(g.resources.gold, def.sellPrice);
      return true;
    }

    const state: MerchantState = { inventory, trinkets: TRINKETS, buy, sell };
    ctx.provide(MerchantKey, state);

    setSlot('ledger-panel', LedgerPanel);
    setSlot('game-layout', LedgerLayout);
  },
};

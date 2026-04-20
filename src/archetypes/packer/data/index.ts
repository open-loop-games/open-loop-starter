import type { PackerData } from './types';
import { ITEMS } from './items';
import { ENEMIES } from './enemies';
import { UPGRADES } from './upgrades';
import { DEFAULT_SHOP } from './shop';
import { DEFAULT_ROUNDS } from './rounds';
import { DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export * from './types';
export { ITEMS, ITEM_IDS } from './items';
export { ENEMIES, ENEMY_IDS } from './enemies';
export { UPGRADES } from './upgrades';
export { DEFAULT_SHOP } from './shop';
export { DEFAULT_ROUNDS } from './rounds';
export {
  SPATIAL_MODE,
  COMBAT_SUBSTRATE,
  PRESTIGE_MODE,
  DEFAULT_PROGRESSION,
  DEFAULT_BALANCE,
} from './progression';

export const DEFAULT_PACKER_DATA: PackerData = {
  items: ITEMS,
  enemies: ENEMIES,
  upgrades: UPGRADES,
  shop: DEFAULT_SHOP,
  rounds: DEFAULT_ROUNDS,
  progression: DEFAULT_PROGRESSION,
  balance: DEFAULT_BALANCE,
};

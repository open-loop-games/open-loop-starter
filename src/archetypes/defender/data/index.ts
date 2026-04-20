import type { DefenderData } from './types';
import { DEFENDERS } from './defenders';
import { ENEMIES } from './enemies';
import { UPGRADES } from './upgrades';
import { STAGES } from './stages';
import { DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export * from './types';
export { DEFENDERS, DEFENDER_IDS } from './defenders';
export { ENEMIES, ENEMY_IDS } from './enemies';
export { UPGRADES } from './upgrades';
export { STAGES } from './stages';
export { PRESTIGE_MODE, DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export const DEFAULT_DEFENDER_DATA: DefenderData = {
  defenders: DEFENDERS,
  enemies: ENEMIES,
  upgrades: UPGRADES,
  stages: STAGES,
  progression: DEFAULT_PROGRESSION,
  balance: DEFAULT_BALANCE,
};

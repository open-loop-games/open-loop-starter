import type { CyclerData } from './types';
import { BUILDINGS } from './buildings';
import { ENEMIES } from './enemies';
import { UPGRADES } from './upgrades';
import { DEFAULT_CYCLES } from './cycles';
import { DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export * from './types';
export { BUILDINGS, BUILDING_IDS } from './buildings';
export { ENEMIES, ENEMY_IDS } from './enemies';
export { UPGRADES } from './upgrades';
export { DEFAULT_CYCLES } from './cycles';
export {
  PHASE_CYCLE_MODE,
  ENDGAME_MODE,
  PRESTIGE_MODE,
  DEFAULT_PROGRESSION,
  DEFAULT_BALANCE,
} from './progression';

export const DEFAULT_CYCLER_DATA: CyclerData = {
  buildings: BUILDINGS,
  enemies: ENEMIES,
  upgrades: UPGRADES,
  cycles: DEFAULT_CYCLES,
  progression: DEFAULT_PROGRESSION,
  balance: DEFAULT_BALANCE,
};

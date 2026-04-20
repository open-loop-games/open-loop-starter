import type { SurvivorData } from './types';
import { WEAPONS } from './weapons';
import { PASSIVES } from './passives';
import { EVOLUTIONS } from './evolutions';
import { ENEMIES } from './enemies';
import { STAGES } from './stages';
import { POWER_UPS } from './power-ups';
import { CHARACTERS } from './characters';
import { DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export * from './types';
export { WEAPONS, WEAPON_IDS } from './weapons';
export { PASSIVES, PASSIVE_IDS } from './passives';
export { EVOLUTIONS, EVOLUTION_IDS } from './evolutions';
export { ENEMIES, ENEMY_IDS } from './enemies';
export { STAGES, STAGE_IDS } from './stages';
export { POWER_UPS, POWER_UP_IDS } from './power-ups';
export { CHARACTERS, CHARACTER_IDS } from './characters';
export {
  RUN_MODE,
  SHOP_MODE,
  PRESTIGE_MODE,
  DEFAULT_PROGRESSION,
  DEFAULT_BALANCE,
} from './progression';

export const DEFAULT_SURVIVOR_DATA: SurvivorData = {
  weapons: WEAPONS,
  passives: PASSIVES,
  evolutions: EVOLUTIONS,
  enemies: ENEMIES,
  stages: STAGES,
  powerUps: POWER_UPS,
  characters: CHARACTERS,
  progression: DEFAULT_PROGRESSION,
  balance: DEFAULT_BALANCE,
};

import type { ProducerData } from './types';
import { PRODUCERS, PRODUCER_BALANCE } from './producers';
import { UPGRADES } from './upgrades';
import { ACHIEVEMENTS } from './achievements';

export * from './types';
export {
  PRODUCERS,
  PRODUCER_BALANCE,
  CONTINUOUS_PRODUCER_IDS,
  CLICK_PRODUCER_ID,
} from './producers';
export { UPGRADES, TIER1_UPGRADE_IDS } from './upgrades';
export { ACHIEVEMENTS } from './achievements';

export const DEFAULT_PRODUCER_DATA: ProducerData = {
  producers: PRODUCERS,
  upgrades: UPGRADES,
  achievements: ACHIEVEMENTS,
  balance: PRODUCER_BALANCE,
};

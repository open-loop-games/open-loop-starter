// Barrel for the producer archetype's data layer. Modules close over
// `DEFAULT_PRODUCER_DATA` at install; `boot.ts` deep-partial merges
// overrides through `applyProducerOverrides` before construction.

import { ACHIEVEMENTS } from './achievements';
import { CLICK_PRODUCER_ID, CONTINUOUS_PRODUCER_IDS, PRODUCERS } from './producers';
import { TIER1_UPGRADE_IDS, UPGRADES } from './upgrades';
import type { ProducerData } from './types';

export const DEFAULT_PRODUCER_DATA: ProducerData = {
  producers: PRODUCERS,
  upgrades: UPGRADES,
  achievements: ACHIEVEMENTS,
};

export {
  ACHIEVEMENTS,
  PRODUCERS,
  CLICK_PRODUCER_ID,
  CONTINUOUS_PRODUCER_IDS,
  UPGRADES,
  TIER1_UPGRADE_IDS,
};

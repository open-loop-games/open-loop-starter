import type { InterlockerData } from './types';
import { RESOURCES } from './resources';
import { BUILDINGS, SMELTER_RATES } from './buildings';
import { JOBS } from './jobs';
import { SCIENCES } from './sciences';
import { CRAFTS } from './crafts';

export * from './types';
export { RESOURCES } from './resources';
export { BUILDINGS, SMELTER_RATES } from './buildings';
export { JOBS } from './jobs';
export { SCIENCES } from './sciences';
export { CRAFTS } from './crafts';

/** Immutable default Interlocker data — verbatim Kittens constants with
 *  arc-1 substitutions documented inline in each data file. Modules close
 *  over this at install time; the `tunable()` reader sites publish per-value
 *  defaults from this data so balance probes can perturb without mutating it. */
export const DEFAULT_INTERLOCKER_DATA: InterlockerData = {
  resources: RESOURCES,
  buildings: BUILDINGS,
  jobs: JOBS,
  sciences: SCIENCES,
  crafts: CRAFTS,
  // village.js:9 catnipPerKitten: -0.85/tick × 5 ticks/sec = -4.25/sec.
  catnipPerKittenPerSec: -4.25,
  // village.js:7 kittensPerTickBase: 0.01/tick × 5 = 0.05/sec.
  kittenGrowthRatePerSec: 0.05,
  // Phase-1 stand-in. Phase 5 balance tunes. -0.1/sec is "rate is meaningfully
  // negative" — chosen to give the player a brief grace period before the
  // starvation death loop fires.
  starvationCatnipRateThreshold: -0.1,
};

// Re-export smelter rates as constants for the tuning module's default closures.
export { SMELTER_RATES as _SMELTER_RATES };

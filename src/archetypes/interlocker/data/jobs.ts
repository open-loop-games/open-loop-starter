// 4 job defs, verbatim from `open-loop-research/reference-code/kittensgame/js/village.js:14-77`.
// Per-job modifier values are per-tick (Kittens 5 ticks/sec); converted to
// per-second by ×5 at the data reader site.
//
// Job unlock cascade in canon (science.js):
//   - woodcutter: defaultUnlocked true (visible from start)
//   - farmer: agriculture unlocks (science.js:34)
//   - miner: implied via mine building unlock; arc-1 keys on mining science
//   - scholar: implied via library building unlock; arc-1 keys on agriculture
//     (canon's "library job unlock" pattern threads via the building, but
//     arc-1's predicate-gating prefers a uniform science-keyed cascade).

import type { JobSpec } from './types';

export const JOBS: JobSpec[] = [
  // village.js:14-25 — woodcutter. modifiers.wood = 0.018/tick → 0.09/sec.
  {
    id: 'woodcutter',
    name: 'Woodcutter',
    resource: 'wood',
    baseRatePerSecond: 0.09,
    unlockedByScience: null,
  },
  // village.js:26-35 — farmer. modifiers.catnip = 1/tick → 5/sec.
  {
    id: 'farmer',
    name: 'Farmer',
    resource: 'catnip',
    baseRatePerSecond: 5,
    unlockedByScience: 'agriculture',
  },
  // village.js:36-54 — scholar. modifiers.science = 0.035/tick → 0.175/sec.
  {
    id: 'scholar',
    name: 'Scholar',
    resource: 'science',
    baseRatePerSecond: 0.175,
    unlockedByScience: 'agriculture',
  },
  // village.js:67-76 — miner. modifiers.minerals = 0.05/tick → 0.25/sec.
  {
    id: 'miner',
    name: 'Miner',
    resource: 'minerals',
    baseRatePerSecond: 0.25,
    unlockedByScience: 'mining',
  },
];

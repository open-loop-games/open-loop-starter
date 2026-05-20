import type { WaveDef } from './types';

// Verbatim from `BloonsTD.as:574+ BuildLevels()` — each `ABSTL(count, level, type)`
// call in the source maps to one `WaveStreamSpec`. BTD1 bloon-type encoding:
// `1` = red, `2` = blue, `3` = green, `4` = yellow. Rounds 1–10 use types 1–4
// (arc-1 scope); rounds 11+ introduce yellow-shedding and ranks 5+ which are
// deferred to expansion.
//
// `spawnIntervalSec` is a Phase 1 estimate (~0.5s) derived from the per-frame
// counter + bloonInterval pattern at `BloonsTD.as:1071-1082`. Tune during
// Phase 5 once gameplay is observable.
//
// `cashReward = 101 - round` per `BloonsTD.as:1174-1175` — verbatim formula
// applied inline below.

export const WAVES: WaveDef[] = [
  {
    round: 1,
    streams: [{ bloonId: 'red', count: 12, spawnIntervalSec: 0.5 }],
    cashReward: 100,
  },
  {
    round: 2,
    streams: [{ bloonId: 'red', count: 25, spawnIntervalSec: 0.5 }],
    cashReward: 99,
  },
  {
    round: 3,
    streams: [
      { bloonId: 'red', count: 12, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 2, spawnIntervalSec: 0.5 },
      { bloonId: 'red', count: 12, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 3, spawnIntervalSec: 0.5 },
    ],
    cashReward: 98,
  },
  {
    round: 4,
    streams: [
      { bloonId: 'red', count: 5, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 12, spawnIntervalSec: 0.5 },
      { bloonId: 'red', count: 5, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 12, spawnIntervalSec: 0.5 },
    ],
    cashReward: 97,
  },
  {
    round: 5,
    streams: [
      { bloonId: 'red', count: 15, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 10, spawnIntervalSec: 0.5 },
      { bloonId: 'red', count: 15, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 15, spawnIntervalSec: 0.5 },
    ],
    cashReward: 96,
  },
  {
    round: 6,
    streams: [{ bloonId: 'green', count: 10, spawnIntervalSec: 0.5 }],
    cashReward: 95,
  },
  {
    round: 7,
    streams: [{ bloonId: 'blue', count: 75, spawnIntervalSec: 0.5 }],
    cashReward: 94,
  },
  {
    round: 8,
    streams: [
      { bloonId: 'red', count: 20, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 30, spawnIntervalSec: 0.5 },
      { bloonId: 'red', count: 30, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 20, spawnIntervalSec: 0.5 },
      { bloonId: 'red', count: 20, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 20, spawnIntervalSec: 0.5 },
    ],
    cashReward: 93,
  },
  {
    round: 9,
    streams: [
      { bloonId: 'green', count: 5, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 25, spawnIntervalSec: 0.5 },
      { bloonId: 'green', count: 15, spawnIntervalSec: 0.5 },
      { bloonId: 'blue', count: 25, spawnIntervalSec: 0.5 },
    ],
    cashReward: 92,
  },
  {
    round: 10,
    streams: [{ bloonId: 'green', count: 35, spawnIntervalSec: 0.5 }],
    cashReward: 91,
  },
];

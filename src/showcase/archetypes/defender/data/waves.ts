import type { WaveDef } from './types';

// Verbatim from `BloonsTD.as:574+ BuildLevels()` — each `ABSTL(count, level, type)`
// call in the source maps to one `WaveStreamSpec`. BTD1 bloon-type encoding:
// `1` = red, `2` = blue, `3` = green, `4` = yellow. Rounds 1–10 use types 1–4
// (arc-1 scope); rounds 11+ introduce yellow-shedding and ranks 5+ which are
// deferred to expansion.
//
// `spawnIntervalSec` is per-round, derived from BTD1's formula at
// `BloonsTD.as:1002`:
//
//     this.bloonInterval = 15 - this.curLevel;  // frames
//
// with the dispatch loop checking `counter > bloonInterval` at the SWF's
// 40 fps tick rate (DOMDocument.xml frameRate="40"). counter starts at 0
// and increments each frame, so the first spawn fires at counter ==
// bloonInterval + 1 frames → actual interval = (16 - curLevel) / 40 seconds.
// All streams within a round share the same interval — the dispatcher is
// global per-round, not per-stream.
//
// `cashReward = 101 - round` per `BloonsTD.as:1174-1175` — verbatim formula
// applied inline below.

const spawnIntervalSecForRound = (round: number): number => (16 - round) / 40;

export const WAVES: WaveDef[] = [
  {
    round: 1,
    streams: [{ bloonId: 'red', count: 12, spawnIntervalSec: spawnIntervalSecForRound(1) }],
    cashReward: 100,
  },
  {
    round: 2,
    streams: [{ bloonId: 'red', count: 25, spawnIntervalSec: spawnIntervalSecForRound(2) }],
    cashReward: 99,
  },
  {
    round: 3,
    streams: [
      { bloonId: 'red', count: 12, spawnIntervalSec: spawnIntervalSecForRound(3) },
      { bloonId: 'blue', count: 2, spawnIntervalSec: spawnIntervalSecForRound(3) },
      { bloonId: 'red', count: 12, spawnIntervalSec: spawnIntervalSecForRound(3) },
      { bloonId: 'blue', count: 3, spawnIntervalSec: spawnIntervalSecForRound(3) },
    ],
    cashReward: 98,
  },
  {
    round: 4,
    streams: [
      { bloonId: 'red', count: 5, spawnIntervalSec: spawnIntervalSecForRound(4) },
      { bloonId: 'blue', count: 12, spawnIntervalSec: spawnIntervalSecForRound(4) },
      { bloonId: 'red', count: 5, spawnIntervalSec: spawnIntervalSecForRound(4) },
      { bloonId: 'blue', count: 12, spawnIntervalSec: spawnIntervalSecForRound(4) },
    ],
    cashReward: 97,
  },
  {
    round: 5,
    streams: [
      { bloonId: 'red', count: 15, spawnIntervalSec: spawnIntervalSecForRound(5) },
      { bloonId: 'blue', count: 10, spawnIntervalSec: spawnIntervalSecForRound(5) },
      { bloonId: 'red', count: 15, spawnIntervalSec: spawnIntervalSecForRound(5) },
      { bloonId: 'blue', count: 15, spawnIntervalSec: spawnIntervalSecForRound(5) },
    ],
    cashReward: 96,
  },
  {
    round: 6,
    streams: [{ bloonId: 'green', count: 10, spawnIntervalSec: spawnIntervalSecForRound(6) }],
    cashReward: 95,
  },
  {
    round: 7,
    streams: [{ bloonId: 'blue', count: 75, spawnIntervalSec: spawnIntervalSecForRound(7) }],
    cashReward: 94,
  },
  {
    round: 8,
    streams: [
      { bloonId: 'red', count: 20, spawnIntervalSec: spawnIntervalSecForRound(8) },
      { bloonId: 'blue', count: 30, spawnIntervalSec: spawnIntervalSecForRound(8) },
      { bloonId: 'red', count: 30, spawnIntervalSec: spawnIntervalSecForRound(8) },
      { bloonId: 'blue', count: 20, spawnIntervalSec: spawnIntervalSecForRound(8) },
      { bloonId: 'red', count: 20, spawnIntervalSec: spawnIntervalSecForRound(8) },
      { bloonId: 'blue', count: 20, spawnIntervalSec: spawnIntervalSecForRound(8) },
    ],
    cashReward: 93,
  },
  {
    round: 9,
    streams: [
      { bloonId: 'green', count: 5, spawnIntervalSec: spawnIntervalSecForRound(9) },
      { bloonId: 'blue', count: 25, spawnIntervalSec: spawnIntervalSecForRound(9) },
      { bloonId: 'green', count: 15, spawnIntervalSec: spawnIntervalSecForRound(9) },
      { bloonId: 'blue', count: 25, spawnIntervalSec: spawnIntervalSecForRound(9) },
    ],
    cashReward: 92,
  },
  {
    round: 10,
    streams: [{ bloonId: 'green', count: 35, spawnIntervalSec: spawnIntervalSecForRound(10) }],
    cashReward: 91,
  },
];

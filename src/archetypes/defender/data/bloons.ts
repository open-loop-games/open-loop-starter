import type { BloonDef } from './types';

// BTD1 bloon shedding ladder: popping rank N spawns one rank N-1 at the same
// path position (`Bloon.as:279-281`). Red is the floor — no further shed.
// Lives-on-leak equals rank (`BloonsTD.as:1151`); money per pop is a flat 1
// (`BloonsTD.as:1142`).
//
// Walk speeds are Phase 1 estimates — BTD1 bloon speed lives in SWF
// MovieClip animation FPS, not AS source. Adjust during Phase 5 balance pass
// against observed gameplay; tunable key per bloon is
// `bloons/${id}/speedLaneUnitsPerSec`.

export const BLOONS: BloonDef[] = [
  {
    id: 'red',
    rank: 1,
    speedLaneUnitsPerSec: 30,
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 1,
  },
  {
    id: 'blue',
    rank: 2,
    speedLaneUnitsPerSec: 45,
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 2,
    spawnsOnPop: 'red',
  },
  {
    id: 'green',
    rank: 3,
    speedLaneUnitsPerSec: 60,
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 3,
    spawnsOnPop: 'blue',
  },
  {
    id: 'yellow',
    rank: 4,
    speedLaneUnitsPerSec: 90,
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 4,
    spawnsOnPop: 'green',
  },
];

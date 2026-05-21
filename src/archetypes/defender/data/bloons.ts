import type { BloonDef } from './types';

// BTD1 bloon shedding ladder: popping rank N spawns one rank N-1 at the same
// path position (`Bloon.as:279-281`). Red is the floor — no further shed.
// Lives-on-leak equals rank (`BloonsTD.as:1151`); money per pop is a flat 1
// (`BloonsTD.as:1142`).
//
// ─── Lane-unit calibration (Phase 5a, OL-1029) ─────────────────────────────
// BTD1 ranges and pixel-space distances live in a ~580×400 px playfield
// (Flash MovieClip authoring). Our path is hand-authored on a 20×15 lane-
// unit grid (`data/path.ts`), total length 75 lane-units. The two
// coordinate systems aren't compatible — using BTD1's raw pixel-per-sec
// speeds on our 75-unit path would have red bloons crossing the map in
// well under a second.
//
// Walk speeds are calibrated to make red bloon traversal ~30 sec at
// `speedLaneUnitsPerSec = 2.5` (75 units / 2.5 u/s = 30s). Higher ranks
// preserve BTD1's speed ratio 1 : 1.5 : 2 : 3 (rank-1 : rank-4) per the
// `getSpeed()` switch at `Bloon.as` rank dispatch. The ratio is verbatim
// BTD1; the scalar is recalibrated for the 20×15 grid.
//
// Tunable per bloon: `bloons/${id}/speedLaneUnitsPerSec`. Phase 5b's sim
// probes perturb this against round-clear time to land the elbow.

export const BLOONS: BloonDef[] = [
  {
    id: 'red',
    rank: 1,
    speedLaneUnitsPerSec: 2.5, // Phase 5a calibration; ratio 1.0 vs BTD1's red baseline
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 1,
  },
  {
    id: 'blue',
    rank: 2,
    speedLaneUnitsPerSec: 3.75, // Ratio 1.5 — `Bloon.as` rank-2 dispatch
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 2,
    spawnsOnPop: 'red',
  },
  {
    id: 'green',
    rank: 3,
    speedLaneUnitsPerSec: 5.0, // Ratio 2.0
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 3,
    spawnsOnPop: 'blue',
  },
  {
    id: 'yellow',
    rank: 4,
    speedLaneUnitsPerSec: 7.5, // Ratio 3.0
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 4,
    spawnsOnPop: 'green',
  },
];

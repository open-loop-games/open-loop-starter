import type { BloonDef } from './types';

// BTD1 bloon shedding ladder: popping rank N spawns one rank N-1 at the same
// path position (`Bloon.as:279-281`). Red is the floor — no further shed.
// Lives-on-leak equals rank (`BloonsTD.as:1151`); money per pop is a flat 1
// (`BloonsTD.as:1142`).
//
// Walk speeds derived from each bloon's `plainN` MovieClip frame count
// (SWF Symbol N.xml `DOMFrame duration`). Bloon speed is implicit: each
// plainN sprite walks the same 2137 px path in a different number of
// frames at 40 fps, so px/s = pathPx × 40 / (1 + duration). Values:
//
//   plain1 (red,    Symbol 10, dur=914 → 915 frames) → 2137 × 40 / 915 ≈ 93.4 px/s
//   plain2 (blue,   Symbol 35, dur=766 → 767 frames) → 2137 × 40 / 767 ≈ 111.4 px/s
//   plain3 (green,  Symbol 30, dur=531 → 532 frames) → 2137 × 40 / 532 ≈ 160.7 px/s
//   plain4 (yellow, Symbol 25, dur=293 → 294 frames) → 2137 × 40 / 294 ≈ 290.8 px/s
//
// The actual ratio (1 : 1.19 : 1.72 : 3.11) differs from the wiki-folkloric
// 1 : 1.5 : 2 : 3 we'd been using — the SWF is authoritative. Tunable per
// bloon: `bloons/${id}/speedLaneUnitsPerSec`.

export const BLOONS: BloonDef[] = [
  {
    id: 'red',
    rank: 1,
    speedLaneUnitsPerSec: 93.4, // plain1 Symbol 10 (dur=914, 915 frames @ 40fps)
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 1,
  },
  {
    id: 'blue',
    rank: 2,
    speedLaneUnitsPerSec: 111.4, // plain2 Symbol 35 (dur=766, 767 frames @ 40fps)
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 2,
    spawnsOnPop: 'red',
  },
  {
    id: 'green',
    rank: 3,
    speedLaneUnitsPerSec: 160.7, // plain3 Symbol 30 (dur=531, 532 frames @ 40fps)
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 3,
    spawnsOnPop: 'blue',
  },
  {
    id: 'yellow',
    rank: 4,
    speedLaneUnitsPerSec: 290.8, // plain4 Symbol 25 (dur=293, 294 frames @ 40fps)
    hp: 1,
    freezable: true,
    moneyOnPop: 1,
    livesOnLeak: 4,
    spawnsOnPop: 'green',
  },
];

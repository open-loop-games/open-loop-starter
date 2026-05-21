import type { PathDef } from './types';

// Verbatim BTD1 Monkey Lane, extracted from `plain1` (Symbol 10) in the SWF.
// The path lives as 915 per-frame `Matrix tx/ty` entries on the bloon-sprite
// timeline; tooling notes in `decompile/README.md` (ffdec → XFL). Coords are
// in BTD1 stage pixels under the nominal spawn point `(_x=0, _y=210)` from
// `BloonsTD.as:1126-1127` (`_x = -10 + random(20); _y = 200 + random(20)`).
// Decimated via Douglas-Peucker at eps=10px (915 frames → 19 waypoints,
// 2137 px total length); the bloon enters off-screen left at cell x=-4 and
// exits off-screen top at cell y=-2, which is correct — BTD1's path also
// has the bloon spawn / leak outside the visible playfield.
//
// `cellSizePixels` bridges the coarse placement grid to BTD1 pixel-space.
// Distances, ranges, and speeds live in pixels (verbatim BTD1 values per
// `data/towers.ts` + `data/bloons.ts`); the placement grid is a game-feel
// abstraction for tower placement. Tower world position is
// `(cell.x + 0.5) * cellSizePixels`; bloon world position comes back from
// `map.positionAtDistance(distance_in_px)` in pixels. Placement grid is
// 640×480 px (20×32, 15×32) — matches BTD1 stage dimensions exactly
// (SWF DOMDocument.xml width="640" height="480").
//
// Waypoint coords are floats (not snapped to integer cells); the Bresenham
// raster in `modules/map.ts` rounds them at the cell-classification step.
// The bloon-position interpolation uses the raw floats so the on-screen
// path follows the BTD1 polyline at sub-cell precision.

export const PATH: PathDef = {
  gridWidth: 20,
  gridHeight: 15,
  cellSizePixels: 32,
  waypoints: [
    [-4.0187, 7.7953],
    [3.0734, 7.7594],
    [3.5328, 4.2422],
    [6.3359, 3.9469],
    [6.8797, 4.7313],
    [6.8656, 11.2172],
    [2.3453, 11.6312],
    [2.1469, 13.9219],
    [13.2828, 14.0094],
    [13.5172, 10.3562],
    [12.4734, 9.9094],
    [9.8812, 9.9922],
    [9.6719, 7.1172],
    [9.9328, 6.5734],
    [13.5203, 6.3109],
    [13.5156, 2.825],
    [12.25, 2.3766],
    [8.5625, 2.6063],
    [8.5281, -2.2969],
  ] as const,
};

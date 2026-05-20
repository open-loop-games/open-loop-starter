import type { PathDef } from './types';

// Monkey-Lane S-curve approximation. BTD1's actual path lives in SWF MovieClip
// animation, not AS source — Phase 1 hand-authors a 13-waypoint polyline on a
// 20×15 lane-unit grid tracing a recognizable Monkey-Lane shape (enter top-
// left, multi-segment S-curve, exit bottom-right). Coordinates are integers
// for grid-cell snap; bloon position interpolates linearly between waypoints
// in the Bloon module.

export const PATH: PathDef = {
  gridWidth: 20,
  gridHeight: 15,
  waypoints: [
    [0, 2],
    [4, 2],
    [4, 6],
    [10, 6],
    [10, 2],
    [16, 2],
    [16, 9],
    [12, 9],
    [12, 13],
    [6, 13],
    [6, 9],
    [2, 9],
    [2, 14],
    [19, 14],
  ] as const,
};

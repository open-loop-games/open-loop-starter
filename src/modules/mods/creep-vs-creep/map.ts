/**
 * Symmetric mirrored map generator. Terrain, spawns, and hotspots are placed
 * by coordinate so the geometry is identical every call (per OL-504 cut list
 * — no procedural generation). Optional `factionOrder` rotates which faction
 * spawns at which corner; pass the default `FACTION_IDS` for a stable layout
 * and a shuffled array for per-round variation (OL-511).
 */

import {
  BASE_HP,
  FACTION_IDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  type CellState,
  type FactionId,
  type HotspotDef,
  type SpawnDef,
} from './content';

export interface MapBlueprint {
  /** Row-major dense cell array, length = MAP_WIDTH * MAP_HEIGHT. */
  cells: CellState[];
  /** Row-major passability bitmap (1 passable, 0 blocked). */
  passable: number[];
  spawns: SpawnDef[];
  hotspots: HotspotDef[];
}

const SPAWN_INSET = 4;

export function generateSymmetricMap(
  factionOrder: readonly FactionId[] = FACTION_IDS,
): MapBlueprint {
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;
  const size = w * h;

  const cells: CellState[] = new Array(size);
  const passable: number[] = new Array(size).fill(1);

  for (let i = 0; i < size; i++) {
    cells[i] = { terrain: 'open', owner: null, hp: 0, reservoir: 0 };
  }

  // Cross-shaped rock walls dividing the map into quadrants, with gaps
  // near the centre and edges so growth fronts can still meet.
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  const rocks: Array<[number, number]> = [];
  for (let i = 12; i < 18; i++) {
    rocks.push([i, midY], [w - 1 - i, midY]);
    rocks.push([midX, i], [midX, h - 1 - i]);
  }
  // Small clusters near each quadrant midpoint as macro features.
  const quadrantMids: Array<[number, number]> = [
    [18, 18],
    [w - 19, 18],
    [18, h - 19],
    [w - 19, h - 19],
  ];
  for (const [cx, cy] of quadrantMids) {
    rocks.push([cx, cy], [cx + 1, cy], [cx, cy + 1]);
  }
  for (const [x, y] of rocks) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    cells[i].terrain = 'rock';
    passable[i] = 0;
  }

  // One spawn per faction, one per quadrant corner.
  const spawnCoords: Array<[number, number]> = [
    [SPAWN_INSET, SPAWN_INSET],
    [w - 1 - SPAWN_INSET, SPAWN_INSET],
    [SPAWN_INSET, h - 1 - SPAWN_INSET],
    [w - 1 - SPAWN_INSET, h - 1 - SPAWN_INSET],
  ];
  const spawns: SpawnDef[] = factionOrder.map((faction: FactionId, idx) => {
    const [x, y] = spawnCoords[idx];
    const i = y * w + x;
    cells[i] = { terrain: 'spawn', owner: faction, hp: BASE_HP, reservoir: 0 };
    passable[i] = 1;
    return { faction, x, y };
  });

  // 4 mirrored hotspots + 1 centre. Yields/capacity are placeholders;
  // OL-510 wires real producer rates and depletion/regen.
  const hotspotCoords: Array<[string, number, number]> = [
    ['hs-nw', Math.floor(w * 0.3), Math.floor(h * 0.3)],
    ['hs-ne', w - 1 - Math.floor(w * 0.3), Math.floor(h * 0.3)],
    ['hs-sw', Math.floor(w * 0.3), h - 1 - Math.floor(h * 0.3)],
    ['hs-se', w - 1 - Math.floor(w * 0.3), h - 1 - Math.floor(h * 0.3)],
    ['hs-mid', midX, midY],
  ];
  const hotspots: HotspotDef[] = hotspotCoords.map(([id, x, y]) => {
    const i = y * w + x;
    const capacity = 100;
    cells[i] = {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: id,
      reservoir: capacity,
    };
    passable[i] = 1;
    return { id, x, y, baseYield: 1, capacity };
  });

  return { cells, passable, spawns, hotspots };
}

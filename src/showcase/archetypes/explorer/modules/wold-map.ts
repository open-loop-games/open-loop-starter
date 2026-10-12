/**
 * The Hartwold's generator. Pure: same seed, same wold. The static map is
 * regenerated on every boot, and only what play changes is saved, so changing
 * the generator invalidates existing saves.
 */
import { createSeededRNG, createSpatialGrid } from '@open-loop/engine';
import {
  ANCHORS,
  LAIR,
  LODGE,
  MAP_H,
  MAP_W,
  SPECIES,
  terrainOfBand,
  type Feature,
  type SpeciesId,
  type Terrain,
} from '../data';

export interface Tile {
  terrain: Terrain;
  band: number;
  /** Walking-distance proxy from the lodge that banding is cut on. */
  depth: number;
  blocked: boolean;
  feature: Feature | null;
  herd: SpeciesId | null;
}

/** How deep a tile sits: rows above the lodge plus half the sideways offset. */
export const depthOf = (x: number, y: number): number =>
  Math.max(0, LODGE.y - y) + Math.floor(Math.abs(x - LODGE.x) / 2);

export const tileIndex = (x: number, y: number): number => y * MAP_W + x;

export function generateMap(seed: number): Tile[] {
  const rng = createSeededRNG(seed);
  const tiles: Tile[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const depth = depthOf(x, y);
      const jitter = (rng() - 0.5) * 2;
      const band = Math.max(0, Math.min(4, Math.floor((depth + jitter) / ANCHORS.bandDepth)));
      const nearLodge = Math.abs(x - LODGE.x) <= 1 && Math.abs(y - LODGE.y) <= 1;
      tiles.push({
        terrain: terrainOfBand(band).id,
        band,
        depth,
        blocked: !nearLodge && rng() < 0.14,
        feature: null,
        herd: null,
      });
    }
  }
  const lair = tiles[tileIndex(LAIR.x, LAIR.y)];
  lair.terrain = 'deepwood';
  lair.band = 4;

  carveTrail(tiles, rng);
  closeIslands(tiles);

  tiles[tileIndex(LODGE.x, LODGE.y)].feature = 'lodge';
  lair.feature = 'lair';
  lair.herd = 'hart';
  placeWaystones(tiles, rng);
  placeOne(tiles, rng, 'lookout', (t, x) => t.band === 1 && t.depth >= 6 && x < 8);
  placeOne(tiles, rng, 'lookout', (t, x) => t.band === 3 && t.depth >= 13 && x > 14);
  for (let i = 0; i < 6; i++) placeOne(tiles, rng, 'cache', (t) => t.depth >= 3 + i * 2);
  placeHerds(tiles, rng);
  return tiles;
}

/** A drunkard's walk from lodge to lair, cleared of obstacles, so the Hart is always reachable. */
function carveTrail(tiles: Tile[], rng: () => number): void {
  let { x, y } = LODGE;
  while (x !== LAIR.x || y !== LAIR.y) {
    tiles[tileIndex(x, y)].blocked = false;
    const r = rng();
    if (r < 0.55 && y > LAIR.y) y--;
    else if (r < 0.78)
      x = Math.max(1, Math.min(MAP_W - 2, x + (x < LAIR.x ? 1 : -1) * (rng() < 0.7 ? 1 : -1)));
    else x = Math.max(1, Math.min(MAP_W - 2, x + (rng() < 0.5 ? 1 : -1)));
  }
  tiles[tileIndex(x, y)].blocked = false;
}

/** Wall off any open pocket the lodge cannot reach with every piece of gear. */
function closeIslands(tiles: Tile[]): void {
  const grid = createSpatialGrid<Tile>({
    width: MAP_W,
    height: MAP_H,
    initializer: (x, y) => tiles[tileIndex(x, y)],
  });
  const reached = new Set<number>();
  for (const c of grid.flood(LODGE, (t) => !t.blocked)) reached.add(tileIndex(c.x, c.y));
  tiles.forEach((t, i) => {
    if (!t.blocked && !reached.has(i)) t.blocked = true;
  });
}

function candidates(tiles: Tile[], test: (t: Tile, x: number, y: number) => boolean): number[] {
  const out: number[] = [];
  tiles.forEach((t, i) => {
    if (!t.blocked && t.feature == null && test(t, i % MAP_W, Math.floor(i / MAP_W))) out.push(i);
  });
  return out;
}

function placeOne(
  tiles: Tile[],
  rng: () => number,
  feature: Feature,
  test: (t: Tile, x: number, y: number) => boolean,
): void {
  const pool = candidates(tiles, test);
  if (pool.length === 0) return;
  tiles[pool[Math.floor(rng() * pool.length)]].feature = feature;
}

/** One waystone at the threshold of each band past the meadow. */
function placeWaystones(tiles: Tile[], rng: () => number): void {
  const d = ANCHORS.bandDepth;
  for (let k = 1; k <= 4; k++) {
    const side = k % 2 === 1 ? -1 : 1;
    const targetX = LODGE.x + side * 3;
    const pool = candidates(tiles, (t) => t.depth >= k * d && t.depth <= k * d + 1);
    if (pool.length === 0) continue;
    pool.sort(
      (a, b) => Math.abs((a % MAP_W) - targetX) - Math.abs((b % MAP_W) - targetX) || rng() - 0.5,
    );
    tiles[pool[0]].feature = 'waystone';
  }
}

function placeHerds(tiles: Tile[], rng: () => number): void {
  for (const i of candidates(tiles, (t) => t.depth >= 2)) {
    if (rng() >= 0.2) continue;
    const t = tiles[i];
    const pool = SPECIES.filter((s) => s.band === t.band && s.id !== 'hart');
    const wantDanger = t.band >= 1 && rng() < 0.3;
    const pick = pool.find((s) => s.dangerous === wantDanger) ?? pool[0];
    t.herd = pick.id;
  }
}

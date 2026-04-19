/**
 * 100×100 Director-archetype arena generator. Emits 13 tiered hotspots, 4
 * spawns inside base vaults, and a seeded procedural-rock scatter over a
 * 4-fold rotational symmetry, per `MAP.md` §§ 1 + 5–8.
 *
 * Pipeline (MAP.md § 7): initialise open grid → paint NW base + natural
 * vaults → rotate NW to NE/SE/SW → paint axis-contested vaults explicitly
 * (all four, not rotated) → paint centre vault → NW-quadrant rock scatter
 * composited of small clusters + thin lines → rotate scattered rocks →
 * flood-fill connectivity validation, retry-with-next-seed on failure.
 *
 * Determinism: a single `createSeededRNG(seed)` stream drives every random
 * choice. The caller (grid.ts) resolves `balance.mapSeed === 'random'` to a
 * concrete uint32 once, stores it in a persistent ref, and passes it in via
 * `opts.seed` on every call — so reloads and `regenerate` reuse the same
 * arena.
 *
 * `factionOrder` rotates which faction owns which corner (`[0] → NW`,
 * `[1] → NE`, `[2] → SE`, `[3] → SW`, following the § 1 rotation cycle).
 */

import { createSeededRNG } from 'open-loop-engine';
import type { DirectorArchetypeVars, DirectorBalanceVars } from '@/archetypes/director';
import {
  FACTION_IDS,
  type CellState,
  type FactionId,
  type HotspotDef,
  type HotspotTier,
  type SpawnDef,
} from './content';

export interface MapBlueprint {
  width: number;
  height: number;
  /** Row-major dense cell array, length = width * height. */
  cells: CellState[];
  /** Row-major passability bitmap (1 passable, 0 blocked). */
  passable: number[];
  spawns: SpawnDef[];
  hotspots: HotspotDef[];
}

export interface MapGenOptions {
  archetype: Pick<DirectorArchetypeVars, 'mapWidth' | 'mapHeight'>;
  balance: Pick<
    DirectorBalanceVars,
    'baseHp' | 'hotspotCapacity' | 'hotspotBaseYield' | 'rockDensity'
  >;
  /**
   * Resolved numeric seed. The `'random'` sentinel is handled by the caller
   * (grid.ts) so the resolved value can be stored in a persistent ref and
   * survive reload — keeps this function pure and reproducible.
   */
  seed: number;
  factionOrder?: readonly FactionId[];
}

// ---------------------------------------------------------------------------
// Vault templates
// ---------------------------------------------------------------------------

type VaultSymbol = '.' | '#' | 'S' | 'h' | 'n' | 'c' | 'C';

interface VaultTemplate {
  readonly width: number;
  readonly height: number;
  /** Row-major grid of `width * height` symbols. */
  readonly cells: readonly VaultSymbol[];
}

function defineVault(width: number, height: number, rows: readonly string[]): VaultTemplate {
  if (rows.length !== height) {
    throw new Error(`vault row count ${rows.length} !== declared height ${height}`);
  }
  const cells: VaultSymbol[] = [];
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = (row[x] ?? '.') as VaultSymbol;
      cells.push(ch);
    }
  }
  return { width, height, cells };
}

// MAP.md § 5.1 — base vault (partial rock ring, open to map-center side).
// Rows 7–9 end without an east wall; the spec's 11-char rendering of the
// last two rows is normalised here to 10 wide per the declared size.
const BASE_VAULT = defineVault(10, 10, [
  '##########',
  '#........#',
  '#........#',
  '#..S.....#',
  '#........#',
  '#..h.....#',
  '#........#',
  '#.........',
  '#.........',
  '#.........',
]);

// MAP.md § 5.2 — natural vault.
const NATURAL_VAULT = defineVault(6, 6, [
  '......',
  '......',
  '..n...',
  '......',
  '.#....',
  '......',
]);

// MAP.md § 5.3 — contested vault (rock pillars at corners).
const CONTESTED_VAULT = defineVault(7, 7, [
  '.......',
  '.#...#.',
  '.......',
  '...c...',
  '.......',
  '.#...#.',
  '.......',
]);

// MAP.md § 5.4 — centre vault. The template pattern is 4-fold symmetric about
// its own cell centre (3, 3), but a 100×100 grid has no true rotational fixed
// point — `rotatedPosition` rotates about (49.5, 49.5), offset by (+0.5, +0.5)
// from any integer cell. Painting the template directly therefore produces
// rocks that do not line up under world rotation. We emit the centre-vault
// rocks as two explicit world-aligned orbits instead (matches the spec's
// "broken rock-pillar ring" flavour) and place `hs-center` at (50, 50).
const CENTER_ROCK_ORBIT_ORIGINS: ReadonlyArray<[number, number]> = [
  [48, 47],
  [47, 48],
];

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

/**
 * MAP.md § 1 rotation formula. Quadrant 0 is NW (identity); 1/2/3 are NE/SE/SW
 * in the rotation cycle used for id suffixes and faction assignment.
 */
function rotatedPosition(
  x: number,
  y: number,
  quadrant: 0 | 1 | 2 | 3,
  w: number,
  h: number,
): [number, number] {
  switch (quadrant) {
    case 0:
      return [x, y];
    case 1:
      return [w - 1 - y, x];
    case 2:
      return [w - 1 - x, h - 1 - y];
    case 3:
      return [y, h - 1 - x];
  }
}

const QUADRANT_SUFFIX = ['nw', 'ne', 'se', 'sw'] as const;

// ---------------------------------------------------------------------------
// Cell / passable painting
// ---------------------------------------------------------------------------

function openCell(): CellState {
  return { terrain: 'open', owner: null, hp: 0, reservoir: 0 };
}

function rockCell(): CellState {
  return { terrain: 'rock', owner: null, hp: 0, reservoir: 0 };
}

interface PaintContext {
  cells: CellState[];
  passable: number[];
  w: number;
  h: number;
}

interface MarkerSpec {
  symbol: 'S' | 'h' | 'n' | 'c' | 'C';
  x: number;
  y: number;
}

function paintVaultTerrain(
  ctx: PaintContext,
  template: VaultTemplate,
  offsetX: number,
  offsetY: number,
  markers: MarkerSpec[],
  paintedRocks?: Array<[number, number]>,
): void {
  const { cells, passable, w, h } = ctx;
  for (let ry = 0; ry < template.height; ry++) {
    for (let rx = 0; rx < template.width; rx++) {
      const x = offsetX + rx;
      const y = offsetY + ry;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const sym = template.cells[ry * template.width + rx];
      const i = y * w + x;
      switch (sym) {
        case '.':
          break; // leave as-is (default open)
        case '#':
          cells[i] = rockCell();
          passable[i] = 0;
          if (paintedRocks) paintedRocks.push([x, y]);
          break;
        case 'S':
        case 'h':
        case 'n':
        case 'c':
        case 'C':
          markers.push({ symbol: sym, x, y });
          break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Quadrant rotation (terrain + passable, overwriting target quadrants)
// ---------------------------------------------------------------------------

function rotateQuadrantContent(ctx: PaintContext): void {
  const { cells, passable, w, h } = ctx;
  const halfW = w >>> 1;
  const halfH = h >>> 1;
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const src = y * w + x;
      for (let q = 1 as 1 | 2 | 3; q <= 3; q = (q + 1) as 1 | 2 | 3) {
        const [tx, ty] = rotatedPosition(x, y, q, w, h);
        const ti = ty * w + tx;
        cells[ti] = { ...cells[src] };
        passable[ti] = passable[src];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rock scatter
// ---------------------------------------------------------------------------

const CLUSTERS_PER_QUADRANT = 8;
const CLUSTER_MIN_SIZE = 3;
const CLUSTER_MAX_SIZE = 5;
const CLUSTER_GROWTH_PROB = 0.5;
const CLUSTER_MIN_SPACING = 4;

const LINES_PER_QUADRANT = 3;
const LINE_MIN_LEN = 5;
const LINE_MAX_LEN = 10;
const LINE_DRIFT_PROB = 0.15;

const NEIGHBOURS_4: ReadonlyArray<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const DIRECTIONS_8: ReadonlyArray<[number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

function scatterRocks(
  ctx: PaintContext,
  rng: () => number,
  density: number,
): Set<number> {
  const { cells, passable, w, h } = ctx;
  const halfW = w >>> 1;
  const halfH = h >>> 1;
  const scattered = new Set<number>();
  const clusterCenters: Array<[number, number]> = [];

  const canPaintRock = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= halfW || y >= halfH) return false;
    const i = y * w + x;
    return cells[i].terrain === 'open';
  };

  const paintRock = (x: number, y: number): void => {
    const i = y * w + x;
    cells[i] = rockCell();
    passable[i] = 0;
    scattered.add(i);
  };

  // Clusters
  const clusterTargetMul = Math.max(0.5, density / 0.125);
  const clusterCount = Math.round(CLUSTERS_PER_QUADRANT * clusterTargetMul);
  for (let cidx = 0; cidx < clusterCount; cidx++) {
    // Try up to 30 random origins for the cluster centre.
    let originX = -1;
    let originY = -1;
    for (let attempt = 0; attempt < 30; attempt++) {
      const rx = Math.floor(rng() * halfW);
      const ry = Math.floor(rng() * halfH);
      if (!canPaintRock(rx, ry)) continue;
      let tooClose = false;
      for (const [cx, cy] of clusterCenters) {
        const dx = rx - cx;
        const dy = ry - cy;
        if (dx * dx + dy * dy < CLUSTER_MIN_SPACING * CLUSTER_MIN_SPACING) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        originX = rx;
        originY = ry;
        break;
      }
    }
    if (originX < 0) continue;
    clusterCenters.push([originX, originY]);

    const targetSize =
      CLUSTER_MIN_SIZE + Math.floor(rng() * (CLUSTER_MAX_SIZE - CLUSTER_MIN_SIZE + 1));
    const frontier: Array<[number, number]> = [[originX, originY]];
    const clusterCells = new Set<number>();
    paintRock(originX, originY);
    clusterCells.add(originY * w + originX);
    while (frontier.length > 0 && clusterCells.size < targetSize) {
      const [fx, fy] = frontier.shift()!;
      for (const [dx, dy] of NEIGHBOURS_4) {
        if (clusterCells.size >= targetSize) break;
        const nx = fx + dx;
        const ny = fy + dy;
        const ni = ny * w + nx;
        if (!canPaintRock(nx, ny) || clusterCells.has(ni)) continue;
        if (rng() >= CLUSTER_GROWTH_PROB) continue;
        paintRock(nx, ny);
        clusterCells.add(ni);
        frontier.push([nx, ny]);
      }
    }
  }

  // Thin lines
  const lineCount = Math.round(LINES_PER_QUADRANT * clusterTargetMul);
  for (let lidx = 0; lidx < lineCount; lidx++) {
    let sx = -1;
    let sy = -1;
    for (let attempt = 0; attempt < 30; attempt++) {
      const rx = Math.floor(rng() * halfW);
      const ry = Math.floor(rng() * halfH);
      if (canPaintRock(rx, ry)) {
        sx = rx;
        sy = ry;
        break;
      }
    }
    if (sx < 0) continue;
    let dirIdx = Math.floor(rng() * DIRECTIONS_8.length);
    const length = LINE_MIN_LEN + Math.floor(rng() * (LINE_MAX_LEN - LINE_MIN_LEN + 1));
    let x = sx;
    let y = sy;
    paintRock(x, y);
    for (let step = 1; step < length; step++) {
      const roll = rng();
      if (roll < LINE_DRIFT_PROB) dirIdx = (dirIdx + DIRECTIONS_8.length - 1) % DIRECTIONS_8.length;
      else if (roll < LINE_DRIFT_PROB * 2) dirIdx = (dirIdx + 1) % DIRECTIONS_8.length;
      // else keep straight.
      const [dx, dy] = DIRECTIONS_8[dirIdx];
      x += dx;
      y += dy;
      if (!canPaintRock(x, y)) break;
      paintRock(x, y);
    }
  }
  return scattered;
}

function rotateScatteredRocks(ctx: PaintContext, scattered: Set<number>): void {
  const { cells, passable, w, h } = ctx;
  for (const i of scattered) {
    const x = i % w;
    const y = (i - x) / w;
    for (let q = 1 as 1 | 2 | 3; q <= 3; q = (q + 1) as 1 | 2 | 3) {
      const [tx, ty] = rotatedPosition(x, y, q, w, h);
      const ti = ty * w + tx;
      if (cells[ti].terrain === 'open') {
        cells[ti] = rockCell();
        passable[ti] = 0;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Finalise markers → spawn + hotspot cells + defs
// ---------------------------------------------------------------------------

function tierForSymbol(sym: MarkerSpec['symbol']): HotspotTier {
  switch (sym) {
    case 'h':
      return 'near';
    case 'n':
      return 'natural';
    case 'c':
      return 'contested';
    case 'C':
      return 'center';
    case 'S':
      throw new Error('S is not a hotspot marker');
  }
}

function nearNaturalId(sym: 'h' | 'n', quadrant: 0 | 1 | 2 | 3): string {
  const tier = sym === 'h' ? 'near' : 'natural';
  return `hs-${tier}-${QUADRANT_SUFFIX[quadrant]}`;
}

// ---------------------------------------------------------------------------
// Connectivity validation
// ---------------------------------------------------------------------------

function validateConnectivity(blueprint: MapBlueprint): boolean {
  const { width: w, height: h, passable, cells, spawns, hotspots } = blueprint;
  if (hotspots.length === 0) return true;
  for (const spawn of spawns) {
    const reachable = new Set<string>();
    const visited = new Uint8Array(w * h);
    const queue: Array<[number, number]> = [[spawn.x, spawn.y]];
    visited[spawn.y * w + spawn.x] = 1;
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const i = y * w + x;
      if (cells[i].terrain === 'hotspot' && cells[i].hotspotId) {
        reachable.add(cells[i].hotspotId!);
      }
      for (const [dx, dy] of NEIGHBOURS_4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (visited[ni] || !passable[ni]) continue;
        visited[ni] = 1;
        queue.push([nx, ny]);
      }
    }
    for (const hs of hotspots) {
      if (!reachable.has(hs.id)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

const MAX_RETRIES = 16;

export function generateSymmetricMap(opts: MapGenOptions): MapBlueprint {
  return generateWithSeed(opts, opts.seed >>> 0, MAX_RETRIES);
}

function generateWithSeed(opts: MapGenOptions, seed: number, retriesLeft: number): MapBlueprint {
  const {
    archetype: { mapWidth: w, mapHeight: h },
    balance: { baseHp, hotspotCapacity, hotspotBaseYield, rockDensity },
    factionOrder = FACTION_IDS,
  } = opts;

  const size = w * h;
  const cells: CellState[] = new Array(size);
  const passable: number[] = new Array(size).fill(1);
  for (let i = 0; i < size; i++) cells[i] = openCell();
  const ctx: PaintContext = { cells, passable, w, h };

  // NW-quadrant vaults. Markers are collected per-quadrant so rotation can
  // fan them out to 4 factions / 4 quadrant ids.
  const nwMarkers: MarkerSpec[] = [];
  paintVaultTerrain(ctx, BASE_VAULT, 0, 0, nwMarkers);
  paintVaultTerrain(ctx, NATURAL_VAULT, 19, 19, nwMarkers);

  // Rotate NW quadrant into NE/SE/SW (terrain + passable only; markers are
  // fanned out below).
  rotateQuadrantContent(ctx);

  // Contested vaults — paint N explicitly on the N axis, then rotate its
  // written cells (rocks + c markers) 3 times. MAP.md § 5.3 wants "all four
  // placed explicitly, not rotated" as a generator-structure hint; in practice
  // we place N then derive E/S/W by rotation so the rocks line up exactly
  // under the (49.5, 49.5) world rotation centre.
  const contestedMarkers: Array<{ x: number; y: number; id: string }> = [];
  const nContestedMarkers: MarkerSpec[] = [];
  const nContestedRocks: Array<[number, number]> = [];
  const CONTESTED_QUADRANT_SUFFIX = ['n', 'e', 's', 'w'] as const;
  paintVaultTerrain(ctx, CONTESTED_VAULT, w / 2 - 3, 19, nContestedMarkers, nContestedRocks);
  for (let q = 0; q < 4; q++) {
    const quadrant = q as 0 | 1 | 2 | 3;
    for (const [rx, ry] of nContestedRocks) {
      const [tx, ty] = rotatedPosition(rx, ry, quadrant, w, h);
      const ti = ty * w + tx;
      cells[ti] = rockCell();
      passable[ti] = 0;
    }
    for (const m of nContestedMarkers) {
      if (m.symbol !== 'c') continue;
      const [tx, ty] = rotatedPosition(m.x, m.y, quadrant, w, h);
      contestedMarkers.push({ x: tx, y: ty, id: `hs-contested-${CONTESTED_QUADRANT_SUFFIX[quadrant]}` });
    }
  }

  // Centre rock ring — 2 explicit orbits around the (49.5, 49.5) rotation
  // centre. See CENTER_ROCK_ORBIT_ORIGINS for the rationale (even-grid has no
  // integer rotational fixed point).
  for (const [ox, oy] of CENTER_ROCK_ORBIT_ORIGINS) {
    for (let q = 0; q < 4; q++) {
      const quadrant = q as 0 | 1 | 2 | 3;
      const [tx, ty] = rotatedPosition(ox, oy, quadrant, w, h);
      const ti = ty * w + tx;
      cells[ti] = rockCell();
      passable[ti] = 0;
    }
  }
  // The centre hotspot occupies a single cell at (50, 50); its 3 orbit
  // partners (49, 50), (49, 49), (50, 49) stay open. A true 4-fold fixed
  // point would need an odd-sized grid.
  const centerMarker: MarkerSpec = { symbol: 'C', x: w / 2, y: h / 2 };

  // Rock scatter — NW only, then mirror-rotate the scattered cells into
  // NE/SE/SW without disturbing vault / marker content.
  const rng = createSeededRNG(seed);
  const scattered = scatterRocks(ctx, rng, rockDensity);
  rotateScatteredRocks(ctx, scattered);

  // Finalise markers → spawn + hotspot cells + defs.
  const spawns: SpawnDef[] = [];
  const hotspots: HotspotDef[] = [];

  for (const m of nwMarkers) {
    for (let q = 0; q < 4; q++) {
      const quadrant = q as 0 | 1 | 2 | 3;
      const [mx, my] = rotatedPosition(m.x, m.y, quadrant, w, h);
      const mi = my * w + mx;
      if (m.symbol === 'S') {
        const faction = factionOrder[quadrant];
        cells[mi] = { terrain: 'spawn', owner: faction, hp: baseHp, reservoir: 0 };
        passable[mi] = 1;
        spawns.push({ faction, x: mx, y: my });
      } else if (m.symbol === 'h' || m.symbol === 'n') {
        const id = nearNaturalId(m.symbol, quadrant);
        const tier = tierForSymbol(m.symbol);
        cells[mi] = {
          terrain: 'hotspot',
          owner: null,
          hp: 0,
          hotspotId: id,
          reservoir: hotspotCapacity,
        };
        passable[mi] = 1;
        hotspots.push({ id, x: mx, y: my, baseYield: hotspotBaseYield, capacity: hotspotCapacity, tier });
      }
    }
  }

  for (const m of contestedMarkers) {
    const mi = m.y * w + m.x;
    cells[mi] = {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: m.id,
      reservoir: hotspotCapacity,
    };
    passable[mi] = 1;
    hotspots.push({
      id: m.id,
      x: m.x,
      y: m.y,
      baseYield: hotspotBaseYield,
      capacity: hotspotCapacity,
      tier: 'contested',
    });
  }

  {
    const id = 'hs-center';
    const mi = centerMarker.y * w + centerMarker.x;
    cells[mi] = {
      terrain: 'hotspot',
      owner: null,
      hp: 0,
      hotspotId: id,
      reservoir: hotspotCapacity,
    };
    passable[mi] = 1;
    hotspots.push({
      id,
      x: centerMarker.x,
      y: centerMarker.y,
      baseYield: hotspotBaseYield,
      capacity: hotspotCapacity,
      tier: 'center',
    });
  }

  const blueprint: MapBlueprint = { width: w, height: h, cells, passable, spawns, hotspots };

  if (!validateConnectivity(blueprint)) {
    if (retriesLeft <= 0) {
      throw new Error(`map generation: connectivity failed after ${MAX_RETRIES} retries`);
    }
    return generateWithSeed(opts, (seed + 1) >>> 0, retriesLeft - 1);
  }

  return blueprint;
}

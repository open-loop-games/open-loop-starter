/**
 * Slime-mold-style territorial spread (OL-506).
 *
 * Per faction, once per spread interval, scan owned cells for
 * passable+unowned neighbours and probabilistically claim one. Score:
 *
 *   weight = TERRAIN_WEIGHT[candidate] × (1 + same-faction neighbours of candidate)
 *
 * Same-faction influence is what makes the growth feel organic — cells
 * surrounded by their own colour are more likely to be claimed than
 * isolated probes, so factions form coherent blobs instead of scattered
 * specks. Hotspots carry extra terrain weight to bias growth toward
 * resource nodes (real producer wiring lands in OL-510).
 *
 * Cadence is driven by an accumulator over the engine's main `onTick` —
 * the engine's `createLoop` is a constrained-replay primitive (Idle
 * Loops, Increlution), not a sub-tick scheduler.
 *
 * Combat (OL-507) lands the steal/flip path; for now spread only claims
 * cells with `owner === null`.
 */

import { random, type SpatialGrid } from 'open-loop-engine';
import {
  BASE_HP,
  FACTION_IDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  type CellState,
  type FactionId,
  type TerrainKind,
} from './content';

const SPREAD_INTERVAL_S = 1;

/** Cells claimed per faction per spread tick. OL-510 will scale this via chains. */
const BASE_SPREAD_POWER = 1;

const TERRAIN_WEIGHT: Record<TerrainKind, number> = {
  open: 1,
  hotspot: 3,
  spawn: 0,
  rock: 0,
};

interface Candidate {
  x: number;
  y: number;
  weight: number;
}

function pickByWeight<T extends { weight: number }>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  let total = 0;
  for (const it of items) total += it.weight;
  if (total <= 0) return undefined;
  let roll = random() * total;
  for (const it of items) {
    roll -= it.weight;
    if (roll < 0) return it;
  }
  return items[items.length - 1];
}

export interface SpreadSystem {
  /** Cells claimed since system construction, per faction. Read for UI/diagnostics. */
  totalClaimed: Record<FactionId, number>;
  /** Drive a single spread tick. Exposed for tests; production uses {@link onEngineTick}. */
  tickOnce(): void;
  /** Engine `onTick` handler — accumulates dt and fires `tickOnce` at SPREAD_INTERVAL_S. */
  onEngineTick(dt: number): void;
}

export function createSpreadSystem(grid: SpatialGrid<CellState>): SpreadSystem {
  const totalClaimed: Record<FactionId, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };
  let acc = 0;
  // Reused per-tick to avoid hot-path allocation.
  const candidates: Candidate[] = [];

  function tickOnce(): void {
    for (const faction of FACTION_IDS) {
      candidates.length = 0;
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (grid.at(x, y).owner !== faction) continue;
          for (const n of grid.neighbors(x, y)) {
            const i = n.y * MAP_WIDTH + n.x;
            if (!grid.passable[i]) continue;
            const ncell = grid.at(n.x, n.y);
            if (ncell.owner !== null) continue;
            const baseW = TERRAIN_WEIGHT[ncell.terrain];
            if (baseW === 0) continue;
            let influence = 1;
            for (const nn of grid.neighbors(n.x, n.y)) {
              if (grid.at(nn.x, nn.y).owner === faction) influence++;
            }
            candidates.push({ x: n.x, y: n.y, weight: baseW * influence });
          }
        }
      }
      for (let p = 0; p < BASE_SPREAD_POWER; p++) {
        const picked = pickByWeight(candidates);
        if (!picked) break;
        const target = grid.at(picked.x, picked.y);
        // Re-check ownership in case BASE_SPREAD_POWER > 1 in future and an
        // earlier pick this tick already claimed the same cell.
        if (target.owner !== null) continue;
        grid.set(picked.x, picked.y, { ...target, owner: faction, hp: BASE_HP });
        totalClaimed[faction]++;
      }
    }
  }

  function onEngineTick(dt: number): void {
    acc += dt;
    while (acc >= SPREAD_INTERVAL_S) {
      acc -= SPREAD_INTERVAL_S;
      tickOnce();
    }
  }

  return { totalClaimed, tickOnce, onEngineTick };
}

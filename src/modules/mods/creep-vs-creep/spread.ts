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
 * Loops, Increlution), not a sub-tick scheduler. Flow-field coupling
 * (OL-608) will further bias the picker once OL-606 lands.
 */

import {
  Decimal,
  random,
  type DecimalSource,
  type Modifier,
  type SpatialGrid,
} from 'open-loop-engine';
import { FACTION_IDS, type CellState, type FactionId, type TerrainKind } from './content';

const SPREAD_INTERVAL_S = 1;

/**
 * Cells claimed per faction per spread tick before chain modulation. Goals
 * (OL-508) and upgrades (OL-510) push modifiers onto each faction's spread
 * chain; the chain's `apply` is what drives the per-tick loop count.
 */
const BASE_SPREAD_POWER = 1;

export type SpreadChains = Record<FactionId, Modifier>;

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

export interface SpreadSystemOptions {
  grid: SpatialGrid<CellState>;
  chains: SpreadChains;
  baseHp: DecimalSource;
}

export function createSpreadSystem(opts: SpreadSystemOptions): SpreadSystem {
  const { grid, chains, baseHp } = opts;

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
    const w = grid.width;
    const h = grid.height;
    for (const faction of FACTION_IDS) {
      candidates.length = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid.at(x, y).owner !== faction) continue;
          for (const n of grid.neighbors(x, y)) {
            const i = n.y * w + n.x;
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
      // Floor keeps the tick deterministic: a 1.5× multiplier on the default
      // BASE_SPREAD_POWER of 1 rounds down to 1 pick — fractional picks
      // wouldn't be meaningful as a loop count.
      const power = Math.max(0, Math.floor(new Decimal(chains[faction].apply(BASE_SPREAD_POWER)).toNumber()));
      for (let p = 0; p < power; p++) {
        const picked = pickByWeight(candidates);
        if (!picked) break;
        const target = grid.at(picked.x, picked.y);
        // Re-check ownership in case spread power >1 and an earlier pick this
        // tick already claimed the same cell.
        if (target.owner !== null) continue;
        grid.set(picked.x, picked.y, { ...target, owner: faction, hp: baseHp });
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

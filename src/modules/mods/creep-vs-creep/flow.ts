/**
 * Per-faction per-cell flow field (OL-606, Option C representation per
 * `archetypes/director.md` § 5 / MAP.md § 3).
 *
 * Four `Float32Array(width × height)` buffers — one per faction — carry a
 * scalar flow value per cell. Raw float storage is intentional: flow is a
 * soft probabilistic input consumed by spread and combat, not an economy
 * quantity, and the per-tick arithmetic runs across every owned cell.
 *
 * Per tick: each owned cell reinforces its own field (full rate) and each
 * of its 4-neighbour own-faction cells (diffuse rate), capturing the
 * "supply path" feel — cells deep in contiguous territory accumulate more
 * flow than isolated frontier cells — without a full pathfinding pass.
 * Reinforcement is uniform (no frontier weighting); OL-590.D revisits if
 * the `flow-field-decay-primary-feel` probe needs frontier bias.
 *
 * Decay is exponential in dt (`Math.exp(-flowDecayPerSec × dt)`) so the
 * continuous-time feel survives variable dt and speed multipliers.
 *
 * Flow is not persisted and not coupled to spread or combat in this
 * subtask — OL-590.D wires the couplings. Round reset zeroes the four
 * per-faction buffers in place ({@link FlowField.reset}), called by the
 * round system after `creepGrid.regenerate`; the width × height shape is
 * stable so the buffer allocation survives.
 */

import { FACTION_IDS, type CellState, type FactionId } from './content';
import type { SpatialGrid } from 'open-loop-engine';

const FLOW_INTERVAL_S = 1;

/**
 * Fraction of `flowReinforcementPerTick` delivered to each same-faction
 * 4-neighbour of an owned cell. Self gets full rate; neighbours get
 * `DIFFUSE_COEFF × rate`. A cell with 4 same-faction neighbours thus
 * accumulates (1 + 4 × 0.25) = 2× the rate of an isolated owned cell,
 * producing the supply-path gradient.
 */
const DIFFUSE_COEFF = 0.25;

export interface FlowField {
  /** Read the flow intensity for a faction at a cell. Zero-returns for out-of-bounds. */
  intensity(faction: FactionId, x: number, y: number): number;
  /**
   * Current maximum intensity across the faction's field. Consumers divide by
   * this to normalize a cell's intensity into `[0, 1]` for bounded couplings
   * (spread bias, defense modifier). Returns `0` when the field is all-zero
   * so callers can treat "no flow anywhere" as "no bias" uniformly.
   */
  maxIntensity(faction: FactionId): number;
  /** Add reinforcement at every owned cell (self + diffuse to same-faction neighbours). */
  applyReinforcement(): void;
  /** Multiply every cell by `exp(-decayPerSec × dt)`. */
  applyDecay(dt: number): void;
  /**
   * Zero every cell across every faction. Called by the round system on round
   * reset — without this, stale flow from the previous round lingers for
   * ~`1/flowDecayPerSec` seconds and incorrectly biases fresh-round spread /
   * combat. Also drops the tick accumulator so the first reinforcement beat
   * lands one interval after reset.
   */
  reset(): void;
  /** Engine `onTick` handler — accumulates dt and fires reinforcement + decay at 1 Hz. */
  onEngineTick(dt: number): void;
}

export interface FlowFieldOptions {
  grid: SpatialGrid<CellState>;
  balance: {
    flowDecayPerSec: number;
    flowReinforcementPerTick: number;
  };
}

export function createFlowField(opts: FlowFieldOptions): FlowField {
  const { grid } = opts;
  const { flowDecayPerSec, flowReinforcementPerTick } = opts.balance;

  const w = grid.width;
  const h = grid.height;
  const size = w * h;

  const fields: Record<FactionId, Float32Array> = {
    red: new Float32Array(size),
    blue: new Float32Array(size),
    green: new Float32Array(size),
    yellow: new Float32Array(size),
  };

  let acc = 0;

  function intensity(faction: FactionId, x: number, y: number): number {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return fields[faction][y * w + x];
  }

  function maxIntensity(faction: FactionId): number {
    const field = fields[faction];
    let max = 0;
    for (let i = 0; i < size; i++) {
      const v = field[i];
      if (v > max) max = v;
    }
    return max;
  }

  function applyReinforcement(): void {
    const selfAdd = flowReinforcementPerTick;
    const neighbourAdd = flowReinforcementPerTick * DIFFUSE_COEFF;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const owner = grid.at(x, y).owner;
        if (owner === null) continue;
        const field = fields[owner];
        field[y * w + x] += selfAdd;
        for (const n of grid.neighbors(x, y)) {
          if (grid.at(n.x, n.y).owner === owner) {
            field[n.y * w + n.x] += neighbourAdd;
          }
        }
      }
    }
  }

  function applyDecay(dt: number): void {
    if (dt <= 0) return;
    const factor = Math.exp(-flowDecayPerSec * dt);
    for (const f of FACTION_IDS) {
      const field = fields[f];
      for (let i = 0; i < size; i++) field[i] *= factor;
    }
  }

  function reset(): void {
    for (const f of FACTION_IDS) {
      fields[f].fill(0);
    }
    acc = 0;
  }

  function onEngineTick(dt: number): void {
    acc += dt;
    while (acc >= FLOW_INTERVAL_S) {
      acc -= FLOW_INTERVAL_S;
      applyReinforcement();
      applyDecay(FLOW_INTERVAL_S);
    }
  }

  return { intensity, maxIntensity, applyReinforcement, applyDecay, reset, onEngineTick };
}

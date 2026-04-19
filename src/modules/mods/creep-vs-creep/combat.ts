/**
 * Frontier combat — per-cell HP + chain-driven attack/defense.
 *
 * Frontier cell = owned + at least one differently-owned passable neighbour.
 * Once per combat tick we scan the grid once (not per faction-pair) to build
 * the frontier, then for each frontier cell:
 *
 *   1. Group attacking neighbours by faction.
 *   2. For each attacking faction, damage = max(0,
 *        attackChain[attacker].apply(baseAttack × neighbourCount)
 *        − defenseChain[defender].apply(baseDefense))
 *   3. Subtract the largest per-faction damage from cell HP this tick.
 *      Flip the cell to that attacker when HP ≤ 0, resetting HP to baseHp.
 *
 * Strongest-attacker-wins keeps the per-tick attacker-defender pair singular
 * (matching the singular "attackChain/defenseChain" phrasing in OL-507), and
 * lets the killing blow's faction claim the flip without tracking
 * last-hit-per-cell state.
 *
 * No RNG — pure Decimal arithmetic. The HP-accumulator model was chosen
 * over RNG-per-tick or batched-RNG so chain.apply attribution shows up in
 * combat outcomes end-to-end (OL-507 validation).
 *
 * Flow-field coupling (OL-608) adds a supply-side defense modifier: the
 * defender's local flow is normalized by its faction's current max flow
 * and scaled by `flowToDefenseModifier`, so a cell deep in friendly flow
 * enjoys up to `+flowToDefenseModifier` defense while a frontier cell
 * cut off from supply gets no bonus. The modifier multiplies the chain-
 * computed defense (`defense × (1 + flowToDefenseModifier × flowFactor)`).
 */

import {
  Decimal,
  type DecimalSource,
  type Modifier,
  type SpatialGrid,
} from 'open-loop-engine';
import { FACTION_IDS, type CellState, type FactionId } from './content';
import type { FlowField } from './flow';

const COMBAT_INTERVAL_S = 1;

export type FactionChains = Record<FactionId, Modifier>;

export interface CombatChains {
  attack: FactionChains;
  defense: FactionChains;
}

export interface CombatSystem {
  /** Cells flipped per faction since construction. Diagnostic counter. */
  totalFlipped: Record<FactionId, number>;
  /** Drive a single combat tick. Exposed for tests; production uses {@link onEngineTick}. */
  tickOnce(): void;
  /** Engine `onTick` handler — accumulates dt and fires `tickOnce` at COMBAT_INTERVAL_S. */
  onEngineTick(dt: number): void;
}

export interface CombatSystemOptions {
  grid: SpatialGrid<CellState>;
  chains: CombatChains;
  baseHp: DecimalSource;
  baseAttack: DecimalSource;
  baseDefense: DecimalSource;
  /**
   * Optional flow-field coupling. When present, defense is multiplied by
   * `1 + flowToDefenseModifier × flowFactor` where `flowFactor` is the
   * defender's flow at the cell normalized by its faction's current max
   * flow, clamped to `[0, 1]`. Tests that exercise combat in isolation can
   * omit both fields to run against a zero-flow baseline.
   */
  flow?: FlowField;
  flowToDefenseModifier?: number;
}

export function createCombatSystem(opts: CombatSystemOptions): CombatSystem {
  const { grid, chains, baseHp, baseAttack, baseDefense, flow, flowToDefenseModifier = 0 } = opts;
  const flowActive = flow !== undefined && flowToDefenseModifier > 0;

  const totalFlipped: Record<FactionId, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };
  let acc = 0;

  // Reused per-tick to avoid hot-path allocation.
  const frontier: Array<{ x: number; y: number; owner: FactionId }> = [];
  const attackerCounts: Partial<Record<FactionId, number>> = {};
  // Per-faction max flow for this tick — recomputed each tick so normalization
  // tracks live field state without introducing a cached ceiling (see OL-608
  // uncertainty resolution).
  const maxFlowByFaction: Partial<Record<FactionId, number>> = {};

  function tickOnce(): void {
    const w = grid.width;
    const h = grid.height;
    frontier.length = 0;

    if (flowActive) {
      for (const f of FACTION_IDS) maxFlowByFaction[f] = flow!.maxIntensity(f);
    }

    // Single whole-grid scan builds the frontier set. "No per-faction-pair
    // scan" is the goal — this is O(W·H) once per tick, not O(W·H) × 4.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = grid.at(x, y);
        const owner = cell.owner;
        if (owner === null) continue;
        let isFrontier = false;
        for (const n of grid.neighbors(x, y)) {
          const i = n.y * w + n.x;
          if (!grid.passable[i]) continue;
          const nOwner = grid.at(n.x, n.y).owner;
          if (nOwner !== null && nOwner !== owner) {
            isFrontier = true;
            break;
          }
        }
        if (isFrontier) frontier.push({ x, y, owner });
      }
    }

    for (const { x, y, owner: defender } of frontier) {
      // Group attacking neighbours by faction.
      for (const f of FACTION_IDS) attackerCounts[f] = 0;
      for (const n of grid.neighbors(x, y)) {
        const i = n.y * w + n.x;
        if (!grid.passable[i]) continue;
        const nOwner = grid.at(n.x, n.y).owner;
        if (nOwner === null || nOwner === defender) continue;
        attackerCounts[nOwner] = (attackerCounts[nOwner] ?? 0) + 1;
      }

      let defense: DecimalSource = chains.defense[defender].apply(baseDefense);
      if (flowActive) {
        const maxFlow = maxFlowByFaction[defender] ?? 0;
        if (maxFlow > 0) {
          const rawFactor = flow!.intensity(defender, x, y) / maxFlow;
          const flowFactor = rawFactor < 0 ? 0 : rawFactor > 1 ? 1 : rawFactor;
          defense = Decimal.mul(defense, 1 + flowToDefenseModifier * flowFactor);
        }
      }

      // Strongest attacker (largest damage) claims the tick.
      let bestDamage: Decimal = new Decimal(0);
      let bestAttacker: FactionId | null = null;
      for (const f of FACTION_IDS) {
        const count = attackerCounts[f] ?? 0;
        if (count === 0 || f === defender) continue;
        const rawAttack: DecimalSource = Decimal.mul(baseAttack, count);
        const attack = chains.attack[f].apply(rawAttack);
        const dmg = Decimal.max(0, Decimal.sub(attack, defense));
        if (Decimal.gt(dmg, bestDamage)) {
          bestDamage = new Decimal(dmg);
          bestAttacker = f;
        }
      }

      if (bestAttacker === null || Decimal.lte(bestDamage, 0)) continue;

      const cell = grid.at(x, y);
      const nextHp = Decimal.sub(cell.hp, bestDamage);
      if (Decimal.lte(nextHp, 0)) {
        grid.set(x, y, { ...cell, owner: bestAttacker, hp: baseHp });
        totalFlipped[bestAttacker]++;
      } else {
        grid.set(x, y, { ...cell, hp: nextHp });
      }
    }
  }

  function onEngineTick(dt: number): void {
    acc += dt;
    while (acc >= COMBAT_INTERVAL_S) {
      acc -= COMBAT_INTERVAL_S;
      tickOnce();
    }
  }

  return { totalFlipped, tickOnce, onEngineTick };
}

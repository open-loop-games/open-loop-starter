/**
 * Frontier combat — per-cell HP + chain-driven attack/defense.
 *
 * Frontier cell = owned + at least one differently-owned passable neighbour.
 * Once per combat tick we scan the grid once (not per faction-pair) to build
 * the frontier, then for each frontier cell:
 *
 *   1. Group attacking neighbours by faction.
 *   2. For each attacking faction, damage = max(0,
 *        attackChain[attacker].apply(BASE_ATTACK × neighbourCount)
 *        − defenseChain[defender].apply(BASE_DEFENSE))
 *   3. Subtract the largest per-faction damage from cell HP this tick.
 *      Flip the cell to that attacker when HP ≤ 0, resetting HP to BASE_HP.
 *
 * Strongest-attacker-wins keeps the per-tick attacker-defender pair singular
 * (matching the singular "attackChain/defenseChain" phrasing in OL-507), and
 * lets the killing blow's faction claim the flip without tracking
 * last-hit-per-cell state.
 *
 * No RNG — pure Decimal arithmetic. The HP-accumulator model was chosen
 * over RNG-per-tick or batched-RNG so chain.apply attribution shows up in
 * combat outcomes end-to-end (OL-507 validation).
 */

import {
  Decimal,
  type DecimalSource,
  type Modifier,
  type SpatialGrid,
} from 'open-loop-engine';
import {
  BASE_ATTACK,
  BASE_DEFENSE,
  BASE_HP,
  FACTION_IDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  type CellState,
  type FactionId,
} from './content';

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

export function createCombatSystem(
  grid: SpatialGrid<CellState>,
  chains: CombatChains,
): CombatSystem {
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

  function tickOnce(): void {
    frontier.length = 0;

    // Single whole-grid scan builds the frontier set. "No per-faction-pair
    // scan" is the goal — this is O(W·H) once per tick, not O(W·H) × 4.
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const cell = grid.at(x, y);
        const owner = cell.owner;
        if (owner === null) continue;
        let isFrontier = false;
        for (const n of grid.neighbors(x, y)) {
          const i = n.y * MAP_WIDTH + n.x;
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
        const i = n.y * MAP_WIDTH + n.x;
        if (!grid.passable[i]) continue;
        const nOwner = grid.at(n.x, n.y).owner;
        if (nOwner === null || nOwner === defender) continue;
        attackerCounts[nOwner] = (attackerCounts[nOwner] ?? 0) + 1;
      }

      const defense = chains.defense[defender].apply(BASE_DEFENSE);

      // Strongest attacker (largest damage) claims the tick.
      let bestDamage: Decimal = new Decimal(0);
      let bestAttacker: FactionId | null = null;
      for (const f of FACTION_IDS) {
        const count = attackerCounts[f] ?? 0;
        if (count === 0 || f === defender) continue;
        const rawAttack: DecimalSource = Decimal.mul(BASE_ATTACK, count);
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
        grid.set(x, y, { ...cell, owner: bestAttacker, hp: BASE_HP });
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

/**
 * Flow-coupled spread + combat tests (OL-608).
 *
 * Verifies the two couplings the archetype spec (MAP.md § 3, director.md § 5)
 * ask for:
 *   - Spread: cells inside a faction's own flow attract its expansion,
 *     amplifying the pull toward "supply paths".
 *   - Combat: a defender deep in friendly flow gets a multiplicative defense
 *     bonus, so frontier-but-supplied cells survive longer than frontier-
 *     and-cut-off cells.
 *
 * Normalization is per-faction against the field's current max, so a
 * zero-everywhere flow is a no-op — the spread and combat code paths
 * collapse back to their OL-506/OL-507 behaviour when `flow` is omitted.
 */

import { describe, expect, it } from 'vitest';
import {
  createModifierChain,
  createSpatialGrid,
  seedRNG,
  type ModifierChain,
  type SpatialGrid,
} from 'open-loop-engine';
import { createFlowField } from '../flow';
import { createSpreadSystem } from '../spread';
import { createCombatSystem } from '../combat';
import { FACTION_IDS, type CellState, type FactionId } from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();

function buildGrid(width: number, height: number): SpatialGrid<CellState> {
  const grid = createSpatialGrid<CellState>({
    width,
    height,
    initializer: () => ({ terrain: 'open', owner: null, hp: 0, reservoir: 0 }),
  });
  for (let i = 0; i < grid.passable.length; i++) grid.passable[i] = 1;
  return grid;
}

function buildSpreadChains(): Record<FactionId, ModifierChain> {
  const out = {} as Record<FactionId, ModifierChain>;
  for (const f of FACTION_IDS) out[f] = createModifierChain(`flow-coupling-spread/${f}`);
  return out;
}

function buildCombatChains(): {
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
} {
  const attack = {} as Record<FactionId, ModifierChain>;
  const defense = {} as Record<FactionId, ModifierChain>;
  for (const f of FACTION_IDS) {
    attack[f] = createModifierChain(`flow-coupling-combat/${f}/attack`);
    defense[f] = createModifierChain(`flow-coupling-combat/${f}/defense`);
  }
  return { attack, defense };
}

describe('flow-coupled spread', () => {
  it('claims concentrate near supplier cells with higher flow', () => {
    // Two identical 1×3 red segments on the same column, one near y=3 and one
    // near y=17 of a 20×20 arena. The top segment accumulates flow through
    // reinforcement; the bottom segment is added *after* reinforcement fires,
    // so its cells' fields stay at zero. Symmetric candidate geometry + one
    // faction isolates the flow bias as the only differentiator — claims
    // should cluster toward the top segment.
    //
    // Per-tick: 1 claim (BASE_SPREAD_POWER=1, no chain modifiers). 40 ticks
    // → 40 claims to split. With +50% top bias and ~parity otherwise, the
    // top/bottom split should settle clearly above 50/50; the assertion
    // requires >55% to leave headroom for RNG variance at this sample size.
    const W = 20;
    const H = 20;
    const grid = buildGrid(W, H);

    const TOP_YS = [3, 4, 5];
    const BOTTOM_YS = [15, 16, 17];
    const COL = 10;

    for (const y of TOP_YS) {
      grid.set(COL, y, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
    }

    const flow = createFlowField({
      grid,
      balance: {
        flowDecayPerSec: 0,
        flowReinforcementPerTick: vars.balance.flowReinforcementPerTick,
      },
    });
    for (let t = 0; t < 20; t++) flow.applyReinforcement();

    // Bottom segment added after reinforcement — its cells' flow values are
    // still zero. Any future diffusion from these cells' reinforcement is
    // out of scope: we do not call applyReinforcement again during spread.
    for (const y of BOTTOM_YS) {
      grid.set(COL, y, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
    }

    for (const y of TOP_YS) expect(flow.intensity('red', COL, y)).toBeGreaterThan(0);
    for (const y of BOTTOM_YS) expect(flow.intensity('red', COL, y)).toBe(0);

    const spread = createSpreadSystem({
      grid,
      chains: buildSpreadChains(),
      baseHp: vars.balance.baseHp,
      flow,
      flowToSpreadWeight: vars.balance.flowToSpreadWeight,
    });

    seedRNG(0xc0ffee);
    for (let t = 0; t < 40; t++) spread.tickOnce();

    let topClaims = 0;
    let bottomClaims = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid.at(x, y).owner !== 'red') continue;
        if (x === COL && (TOP_YS.includes(y) || BOTTOM_YS.includes(y))) continue;
        if (y < H / 2) topClaims++;
        else bottomClaims++;
      }
    }

    expect(topClaims).toBeGreaterThan(bottomClaims);
    expect(topClaims / (topClaims + bottomClaims)).toBeGreaterThan(0.55);
  });

  it('omitting flow leaves the spread system untouched vs. the OL-506 baseline', () => {
    // Sanity check — the optional-flow plumbing must not change outcomes
    // when the coupling is not wired. Identical grids + seed with and
    // without flow injection produce the same per-tick claim counts.
    const W = 20;
    const H = 20;

    function run(withFlow: boolean): number {
      const grid = buildGrid(W, H);
      grid.set(3, 3, { terrain: 'open', owner: 'red', hp: 0, reservoir: 0 });
      const flow = createFlowField({
        grid,
        balance: {
          flowDecayPerSec: 0,
          flowReinforcementPerTick: vars.balance.flowReinforcementPerTick,
        },
      });
      const spread = createSpreadSystem({
        grid,
        chains: buildSpreadChains(),
        baseHp: vars.balance.baseHp,
        ...(withFlow
          ? { flow, flowToSpreadWeight: vars.balance.flowToSpreadWeight }
          : {}),
      });
      seedRNG(0xdecaf);
      for (let t = 0; t < 5; t++) spread.tickOnce();
      return spread.totalClaimed.red;
    }

    const noFlow = run(false);
    // Flow wired but zero-everywhere (no reinforcement called) is the
    // branch protected by the `maxFlow > 0` guard in spread.ts.
    const zeroFlow = run(true);
    expect(zeroFlow).toBe(noFlow);
  });
});

describe('flow-coupled combat', () => {
  it('high-flow defender survives longer than a low-flow defender under identical attack', () => {
    // Two independent 5×5 arenas. In both, red defends a single cell under
    // attack from three blue neighbours. The only difference is the red
    // flow intensity at the defender cell — arena A has it at the field's
    // max (factor 1.0), arena B has it at zero (factor 0).
    function runScenario(giveRedFlow: boolean): number {
      const W = 5;
      const H = 5;
      const grid = buildGrid(W, H);
      // Defender at (2, 2); three blue attackers around it.
      grid.set(2, 2, { terrain: 'open', owner: 'red', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(1, 2, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(2, 1, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(3, 2, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });

      const flow = createFlowField({
        grid,
        balance: { flowDecayPerSec: 0, flowReinforcementPerTick: 1 },
      });
      if (giveRedFlow) {
        // A few reinforcement passes — red owns (2,2), so its field at (2,2)
        // ramps up. `maxIntensity('red')` is the (2,2) value, so flowFactor
        // at the defender cell is 1.0 — maximum defense bonus.
        for (let t = 0; t < 5; t++) flow.applyReinforcement();
      }

      const chains = buildCombatChains();
      const combat = createCombatSystem({
        grid,
        chains,
        baseHp: vars.balance.baseHp,
        baseAttack: vars.balance.baseAttack,
        baseDefense: vars.balance.baseDefense,
        flow,
        flowToDefenseModifier: vars.balance.flowToDefenseModifier,
      });

      let ticks = 0;
      while (grid.at(2, 2).owner === 'red' && ticks < 500) {
        combat.tickOnce();
        ticks++;
      }
      return ticks;
    }

    const highFlowSurvival = runScenario(true);
    const lowFlowSurvival = runScenario(false);
    expect(highFlowSurvival).toBeGreaterThan(lowFlowSurvival);
  });

  it('omitting flow matches the OL-507 baseline defense exactly', () => {
    // Wire combat with flow but no reinforcement (maxFlow === 0, branch
    // short-circuits) and assert identical survival to the flow-unwired
    // construction.
    function runScenario(wireFlow: boolean): number {
      const W = 5;
      const H = 5;
      const grid = buildGrid(W, H);
      grid.set(2, 2, { terrain: 'open', owner: 'red', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(1, 2, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(2, 1, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });
      grid.set(3, 2, { terrain: 'open', owner: 'blue', hp: vars.balance.baseHp, reservoir: 0 });

      const flow = createFlowField({
        grid,
        balance: { flowDecayPerSec: 0, flowReinforcementPerTick: 1 },
      });
      const chains = buildCombatChains();
      const combat = createCombatSystem({
        grid,
        chains,
        baseHp: vars.balance.baseHp,
        baseAttack: vars.balance.baseAttack,
        baseDefense: vars.balance.baseDefense,
        ...(wireFlow
          ? { flow, flowToDefenseModifier: vars.balance.flowToDefenseModifier }
          : {}),
      });
      let ticks = 0;
      while (grid.at(2, 2).owner === 'red' && ticks < 500) {
        combat.tickOnce();
        ticks++;
      }
      return ticks;
    }

    expect(runScenario(true)).toBe(runScenario(false));
  });
});

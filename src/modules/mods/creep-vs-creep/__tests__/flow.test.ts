/**
 * Flow-field substrate tests (OL-606).
 *
 * Standalone verification — flow does not yet couple to spread or combat
 * (OL-590.D). We test the module in isolation against a hand-built grid
 * so assertions stay independent of spread's stochastic picker.
 */

import { describe, expect, it } from 'vitest';
import { createSpatialGrid, type SpatialGrid } from 'open-loop-engine';
import { createFlowField } from '../flow';
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

function ownCell(grid: SpatialGrid<CellState>, x: number, y: number, faction: FactionId): void {
  grid.set(x, y, { ...grid.at(x, y), owner: faction });
}

function buildFlow(grid: SpatialGrid<CellState>, overrides: Partial<{
  flowDecayPerSec: number;
  flowReinforcementPerTick: number;
}> = {}) {
  return createFlowField({
    grid,
    balance: {
      flowDecayPerSec: overrides.flowDecayPerSec ?? vars.balance.flowDecayPerSec,
      flowReinforcementPerTick: overrides.flowReinforcementPerTick ?? vars.balance.flowReinforcementPerTick,
    },
  });
}

describe('creep-vs-creep flow field', () => {
  it('fresh field is zero everywhere for every faction', () => {
    const grid = buildGrid(10, 10);
    const flow = buildFlow(grid);
    for (const f of FACTION_IDS) {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(flow.intensity(f, x, y)).toBe(0);
        }
      }
    }
  });

  it('intensity() returns 0 for out-of-bounds reads', () => {
    const grid = buildGrid(5, 5);
    const flow = buildFlow(grid);
    ownCell(grid, 2, 2, 'red');
    flow.applyReinforcement();
    expect(flow.intensity('red', -1, 2)).toBe(0);
    expect(flow.intensity('red', 5, 2)).toBe(0);
    expect(flow.intensity('red', 2, -1)).toBe(0);
    expect(flow.intensity('red', 2, 5)).toBe(0);
  });

  it('reinforces the owning cell and diffuses to same-faction 4-neighbours', () => {
    const grid = buildGrid(5, 5);
    ownCell(grid, 2, 2, 'red');
    // One red-owned cell at (1, 2) — same-faction neighbour to the left.
    ownCell(grid, 1, 2, 'red');
    // Blue-owned to the right — must NOT receive red's diffusion.
    ownCell(grid, 3, 2, 'blue');
    const flow = buildFlow(grid, { flowReinforcementPerTick: 1, flowDecayPerSec: 0 });

    flow.applyReinforcement();

    // (2,2) red self (1.0) + diffuse from red (1,2) (0.25) = 1.25.
    expect(flow.intensity('red', 2, 2)).toBeCloseTo(1.25, 6);
    // (1,2) red self (1.0) + diffuse from red (2,2) (0.25) = 1.25.
    expect(flow.intensity('red', 1, 2)).toBeCloseTo(1.25, 6);
    // (3,2) blue self (1.0); no red-owner neighbour so no red diffusion into it.
    expect(flow.intensity('blue', 3, 2)).toBeCloseTo(1.0, 6);
    // (3,2) in red's field receives no red reinforcement (blue owns it).
    expect(flow.intensity('red', 3, 2)).toBe(0);
    // (2,2) in blue's field is untouched — independent buffers per faction.
    expect(flow.intensity('blue', 2, 2)).toBe(0);
  });

  it('interior cells accumulate more than frontier cells (supply-path gradient)', () => {
    // 3×3 block of red ownership — (1,1) has 4 red neighbours, corner (0,0)
    // has 2, edges (0,1)/(1,0)/(1,2)/(2,1) have 3.
    const grid = buildGrid(5, 5);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) ownCell(grid, x, y, 'red');
    }
    const flow = buildFlow(grid, { flowReinforcementPerTick: 1, flowDecayPerSec: 0 });
    flow.applyReinforcement();

    const interior = flow.intensity('red', 1, 1); // 1.0 + 4 × 0.25
    const edge = flow.intensity('red', 0, 1); // 1.0 + 3 × 0.25
    const corner = flow.intensity('red', 0, 0); // 1.0 + 2 × 0.25

    expect(interior).toBeCloseTo(2.0, 6);
    expect(edge).toBeCloseTo(1.75, 6);
    expect(corner).toBeCloseTo(1.5, 6);
    expect(interior).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThan(corner);
  });

  it('applyDecay multiplies every cell by exp(-decay × dt)', () => {
    const grid = buildGrid(4, 4);
    ownCell(grid, 1, 1, 'red');
    const flow = buildFlow(grid, { flowReinforcementPerTick: 4, flowDecayPerSec: 0.5 });

    flow.applyReinforcement();
    const before = flow.intensity('red', 1, 1);
    expect(before).toBeCloseTo(4.0, 6);

    flow.applyDecay(2);
    const expected = 4.0 * Math.exp(-0.5 * 2);
    expect(flow.intensity('red', 1, 1)).toBeCloseTo(expected, 6);
  });

  it('decay is dt-invariant — two half-steps match one full step', () => {
    const gridA = buildGrid(3, 3);
    const gridB = buildGrid(3, 3);
    ownCell(gridA, 1, 1, 'red');
    ownCell(gridB, 1, 1, 'red');
    const flowA = buildFlow(gridA, { flowReinforcementPerTick: 1, flowDecayPerSec: 0.3 });
    const flowB = buildFlow(gridB, { flowReinforcementPerTick: 1, flowDecayPerSec: 0.3 });

    flowA.applyReinforcement();
    flowA.applyDecay(1.0);

    flowB.applyReinforcement();
    flowB.applyDecay(0.5);
    flowB.applyDecay(0.5);

    expect(flowA.intensity('red', 1, 1)).toBeCloseTo(flowB.intensity('red', 1, 1), 6);
  });

  it('onEngineTick fires at 1 Hz — accumulator gates reinforcement', () => {
    const grid = buildGrid(3, 3);
    ownCell(grid, 1, 1, 'red');
    const flow = buildFlow(grid, { flowReinforcementPerTick: 1, flowDecayPerSec: 0 });

    // Three sub-second sub-ticks — no fire yet.
    flow.onEngineTick(0.3);
    flow.onEngineTick(0.3);
    expect(flow.intensity('red', 1, 1)).toBe(0);
    flow.onEngineTick(0.3);
    expect(flow.intensity('red', 1, 1)).toBe(0);

    // The fourth sub-tick crosses 1.0s and fires once.
    flow.onEngineTick(0.2);
    expect(flow.intensity('red', 1, 1)).toBeCloseTo(1.0, 6);
  });

  it('seeded spawn cells accumulate local flow with distance decay under continuous ticks', () => {
    // Seed 4 spawn cells; tick for N seconds; each spawn's own field should
    // be > 0 at the spawn and drop to 0 at a distant cell (no diffusion past
    // 1 hop because spawns are isolated — no same-faction neighbours).
    const grid = buildGrid(20, 20);
    const spawns: Array<{ x: number; y: number; faction: FactionId }> = [
      { x: 2, y: 2, faction: 'red' },
      { x: 17, y: 2, faction: 'blue' },
      { x: 2, y: 17, faction: 'green' },
      { x: 17, y: 17, faction: 'yellow' },
    ];
    for (const s of spawns) ownCell(grid, s.x, s.y, s.faction);

    const flow = buildFlow(grid);
    for (let t = 0; t < 10; t++) flow.onEngineTick(1);

    for (const s of spawns) {
      expect(flow.intensity(s.faction, s.x, s.y)).toBeGreaterThan(0);
      // No same-faction neighbours → no spread beyond the spawn cell itself.
      expect(flow.intensity(s.faction, s.x + 5, s.y)).toBe(0);
      // Other factions' fields are independent and zero at this cell.
      for (const other of FACTION_IDS) {
        if (other === s.faction) continue;
        expect(flow.intensity(other, s.x, s.y)).toBe(0);
      }
    }
  });
});

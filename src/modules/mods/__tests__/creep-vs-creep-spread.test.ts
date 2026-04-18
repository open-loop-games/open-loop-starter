import { describe, expect, it } from 'vitest';
import { seedRNG, withPersistentContext, type SpatialGridSnapshot } from 'open-loop-engine';
import { FACTION_IDS, type CellState, type FactionId } from '../creep-vs-creep/content';
import { createCreepGrid } from '../creep-vs-creep/grid';
import { createSpreadSystem } from '../creep-vs-creep/spread';

function ownership(snapshot: SpatialGridSnapshot<CellState>): Array<FactionId | ''> {
  return snapshot.cells.map((c) => c.owner ?? '');
}

function buildGrid(): ReturnType<typeof createCreepGrid> {
  return withPersistentContext('test-creep-warfare', () => createCreepGrid());
}

function runSpread(seed: number, ticks: number): SpatialGridSnapshot<CellState> {
  seedRNG(seed);
  const cg = buildGrid();
  const spread = createSpreadSystem(cg.grid);
  for (let t = 0; t < ticks; t++) spread.tickOnce();
  return cg.grid.serialize();
}

describe('creep-vs-creep spread', () => {
  it('each faction grows beyond its spawn over many ticks', () => {
    seedRNG(42);
    const cg = buildGrid();
    const spread = createSpreadSystem(cg.grid);
    for (let t = 0; t < 30; t++) spread.tickOnce();
    const counts: Record<FactionId, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (let y = 0; y < cg.grid.height; y++) {
      for (let x = 0; x < cg.grid.width; x++) {
        const owner = cg.grid.at(x, y).owner;
        if (owner) counts[owner]++;
      }
    }
    for (const f of FACTION_IDS) {
      expect(counts[f], `${f} territory after 30 ticks`).toBeGreaterThan(1);
    }
  });

  it('is deterministic across runs with the same RNG seed', () => {
    const a = runSpread(123, 15);
    const b = runSpread(123, 15);
    expect(ownership(a)).toEqual(ownership(b));
  });

  it('never claims rock cells', () => {
    seedRNG(7);
    const cg = buildGrid();
    const spread = createSpreadSystem(cg.grid);
    for (let t = 0; t < 50; t++) spread.tickOnce();
    for (let y = 0; y < cg.grid.height; y++) {
      for (let x = 0; x < cg.grid.width; x++) {
        const cell = cg.grid.at(x, y);
        if (cell.terrain === 'rock') {
          expect(cell.owner, `rock at ${x},${y}`).toBeNull();
        }
      }
    }
  });
});

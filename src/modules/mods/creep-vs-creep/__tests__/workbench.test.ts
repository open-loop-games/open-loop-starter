/**
 * BalanceWorkbench creep-outcome analyzer (OL-529).
 *
 * Exercises the analyzer's summarize() directly against a grid with known
 * ownership. The prepare and tick hooks are thin shims tested implicitly via
 * manual BalanceWorkbench runs; this suite targets the metric shape — the
 * one thing that affects downstream aggregation and win-rate deltas.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  createEngine,
  type Engine,
  type EngineModule,
} from 'open-loop-engine';
import { createCreepOutcomeAnalyzer } from '../workbench';
import { CreepWarfareKey, createCreepWarfareModule } from '../index';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import {
  BASE_HP,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_FACTION,
  type FactionId,
} from '../content';

function paintFaction(
  engine: Engine,
  faction: FactionId,
  cells: number,
  xOffset: number,
): void {
  const state = engine.tryInject(CreepWarfareKey)!;
  let painted = 0;
  for (let y = 0; y < MAP_HEIGHT && painted < cells; y++) {
    for (let x = xOffset; x < MAP_WIDTH && painted < cells; x++) {
      const cell = state.grid.grid.at(x, y);
      if (cell.terrain === 'rock') continue;
      state.grid.grid.set(x, y, { ...cell, owner: faction, hp: BASE_HP });
      painted++;
    }
  }
}

describe('creep-outcome analyzer', () => {
  let engine: Engine;

  beforeAll(() => {
    const modules: EngineModule[] = [settingsModule, uiRegistryModule, createCreepWarfareModule()];
    engine = createEngine({
      gameId: 'creep-workbench-test',
      tickRate: 20,
      persistence: false,
      persistenceNamespace: `creep-wb-${Math.random().toString(36).slice(2)}`,
      mods: [{ id: 'solo', name: 'solo', modules, description: '' }],
    });
    engine.selectMod('solo');
    engine.start();
  });

  it('reports territoryShare per faction as fractions of the full map', () => {
    // Paint 200 cells red starting at x=0 to avoid contesting other factions'
    // spawn zones. Other factions keep whatever the map generator gave them.
    paintFaction(engine, 'red', 200, 0);
    const analyzer = createCreepOutcomeAnalyzer(engine);
    const result = analyzer.summarize();

    const total = MAP_WIDTH * MAP_HEIGHT;
    expect(result.metrics['territoryShare.red']).toBeGreaterThanOrEqual(200 / total);
    expect(result.metrics['territoryShare.red']).toBeLessThan(1);
    expect(result.metrics['territoryShare.blue']).toBeGreaterThanOrEqual(0);
    expect(result.metrics['territoryShare.green']).toBeGreaterThanOrEqual(0);
    expect(result.metrics['territoryShare.yellow']).toBeGreaterThanOrEqual(0);
  });

  it('emits exactly one win.{faction} = 1 and zeros for the rest', () => {
    // Over-paint red to guarantee it's the leader, even against whatever the
    // map generator pre-assigned for spawn cells.
    paintFaction(engine, 'red', 1000, 0);
    const analyzer = createCreepOutcomeAnalyzer(engine);
    const result = analyzer.summarize();

    const winMetrics: FactionId[] = ['red', 'blue', 'green', 'yellow'];
    const winners = winMetrics.filter((f) => result.metrics[`win.${f}`] === 1);
    expect(winners).toEqual([PLAYER_FACTION]);
    for (const f of winMetrics) {
      if (f === PLAYER_FACTION) continue;
      expect(result.metrics[`win.${f}`]).toBe(0);
    }
  });

  it('emits numeric metrics only — booleans would be dropped by the aggregator', () => {
    const analyzer = createCreepOutcomeAnalyzer(engine);
    const result = analyzer.summarize();
    for (const [key, value] of Object.entries(result.metrics)) {
      expect(typeof value, `metric ${key}`).toBe('number');
    }
  });
});

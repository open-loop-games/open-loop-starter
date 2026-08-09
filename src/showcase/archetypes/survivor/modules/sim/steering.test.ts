/**
 * Steering spec — the decision, not the path. Path quality is
 * `../../balance/steering-probe.ts`'s to print.
 *
 * `chooseHeading` and `scoreHeadings` are one policy in two shapes: the probe
 * reads the breakdown and the sim takes the arg-max, and the whole value of the
 * split is that those cannot disagree. That is what is pinned here.
 */

import { describe, expect, it } from 'vitest';
import { createSpatialGrid, ORTHOGONAL_DELTAS } from '@open-loop/engine';
import { NAV_CELL, chooseHeading, computeFields, scoreHeadings } from './steering';
import type { NavGrid } from './steering';
import { ARENA_BALANCE } from '../../data/arena';
import { BASELINE_SEAT } from '../../data/seats';
import type { ArenaParams, ArenaState, Specimen } from './types';

function nav(): NavGrid {
  const cols = Math.ceil(ARENA_BALANCE.mapWidth / NAV_CELL);
  const rows = Math.ceil(ARENA_BALANCE.mapHeight / NAV_CELL);
  return {
    cols,
    rows,
    grid: createSpatialGrid<number>({
      width: cols,
      height: rows,
      initializer: () => 0,
      neighborhood: ORTHOGONAL_DELTAS,
    }),
  };
}

const params: ArenaParams = {
  engage: BASELINE_SEAT.engage,
  eta: BASELINE_SEAT.eta,
  speedMul: 1,
  dpsMul: 1,
  toughnessMul: 1,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: () => 0.5,
};

function specimen(id: number, x: number, y: number): Specimen {
  return { id, tierId: 'x', hp: 100, speed: 0, contactDamage: 1, moteYield: 1, x, y };
}

/** A floor with a mass off to +x and a scatter of motes off to −y. */
function state(): ArenaState {
  const cx = ARENA_BALANCE.mapWidth / 2;
  const cy = ARENA_BALANCE.mapHeight / 2;
  return {
    time: 60,
    operator: { x: cx, y: cy, hp: 100, maxHp: 100, heading: { x: 1, y: 0 } },
    specimens: Array.from({ length: 20 }, (_, i) =>
      specimen(i, cx + 150 + (i % 5) * 30, cy + i * 8),
    ),
    motes: Array.from({ length: 6 }, (_, i) => ({
      id: 100 + i,
      x: cx - i * 20,
      y: cy - 300,
      value: 1,
      droppedAt: 0,
    })),
    collectors: [],
    collectorTimes: [],
    collectorsDropped: 0,
    devices: [],
    reagentStacks: new Map(),
    stats: {
      kills: 0,
      motesDropped: 0,
      motesBanked: 0,
      motesCollectedByCollector: 0,
      collectorsTaken: 0,
      contactSeconds: 0,
      damageTaken: 0,
      devices: {},
      spawned: 0,
    },
    nextId: 1000,
    spawnCarry: 0,
  };
}

describe('survivor/steering — score and choice are one policy', () => {
  it('picks exactly the candidate the breakdown scores highest', () => {
    const s = state();
    const n = nav();
    const fields = computeFields(s, n, 0);

    const scores = scoreHeadings(s, n, fields, params);
    const best = scores.reduce((a, b) => (b.total > a.total ? b : a));
    const chosen = chooseHeading(s, n, fields, params);

    expect(chosen).toEqual(best.heading);
  });

  it('sums each breakdown back to the total it was decided on', () => {
    const s = state();
    const n = nav();
    const fields = computeFields(s, n, 0);

    for (const c of scoreHeadings(s, n, fields, params)) {
      // `mote` and `collector` are reported unweighted so a reader can see the
      // raw field; `eta` is the seat's weight on income and belongs to the sum.
      const recomposed =
        c.threat +
        c.engage +
        c.connect +
        params.eta * (2.5 * c.mote + c.moteNear + c.collector) +
        c.wall +
        c.turn;
      expect(recomposed).toBeCloseTo(c.total, 9);
    }
  });

  it('scores only headings that stay on the map', () => {
    const s = state();
    s.operator.x = 20;
    s.operator.y = 20;
    const n = nav();
    const fields = computeFields(s, n, 0);

    const scores = scoreHeadings(s, n, fields, params);
    // A corner drops the candidates that leave the floor, and the arg-max must
    // run over what is left rather than over a padded set.
    expect(scores.length).toBeGreaterThan(0);
    expect(scores.length).toBeLessThan(16);
  });
});

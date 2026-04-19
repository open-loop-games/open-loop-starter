/**
 * Generator tests for the 100×100 Director arena (OL-607).
 *
 * Covers determinism, structural invariants, and flood-fill connectivity —
 * the three guarantees the downstream Director subsystems rely on (OL-608
 * flow-field, OL-609 goal ids, OL-610 round retention).
 */

import { describe, expect, it } from 'vitest';
import { generateSymmetricMap, type MapBlueprint, type MapGenOptions } from '../map';
import { FACTION_IDS, type FactionId, type HotspotTier } from '../content';
import { loadCreepVsCreepVars } from '../vars';

const vars = loadCreepVsCreepVars();
const W = vars.archetype.mapWidth;
const H = vars.archetype.mapHeight;

function makeOpts(seedOverride: number): MapGenOptions {
  return {
    archetype: { mapWidth: W, mapHeight: H },
    balance: {
      baseHp: vars.balance.baseHp,
      hotspotCapacity: vars.balance.hotspotCapacity,
      hotspotBaseYield: vars.balance.hotspotBaseYield,
      rockDensity: vars.balance.rockDensity,
      mapSeed: seedOverride,
    },
  };
}

function cellFingerprint(bp: MapBlueprint): string {
  return bp.cells.map((c) => c.terrain[0]).join('');
}

function hotspotFingerprint(bp: MapBlueprint): string {
  return bp.hotspots
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((h) => `${h.id}@${h.x},${h.y}:${h.tier}`)
    .join('|');
}

describe('generateSymmetricMap — determinism', () => {
  it('produces bitwise-identical cells + hotspots across runs with the same seed', () => {
    const a = generateSymmetricMap(makeOpts(42));
    const b = generateSymmetricMap(makeOpts(42));
    expect(cellFingerprint(a)).toBe(cellFingerprint(b));
    expect(hotspotFingerprint(a)).toBe(hotspotFingerprint(b));
    expect(a.passable.join(',')).toBe(b.passable.join(','));
  });

  it('different seeds yield different rock layouts', () => {
    const a = generateSymmetricMap(makeOpts(42));
    const b = generateSymmetricMap(makeOpts(43));
    expect(cellFingerprint(a)).not.toBe(cellFingerprint(b));
  });

  it('resolves `mapSeed: "random"` to a numeric seed and pins it in-place', () => {
    const opts: MapGenOptions = {
      archetype: { mapWidth: W, mapHeight: H },
      balance: {
        baseHp: vars.balance.baseHp,
        hotspotCapacity: vars.balance.hotspotCapacity,
        hotspotBaseYield: vars.balance.hotspotBaseYield,
        rockDensity: vars.balance.rockDensity,
        mapSeed: 'random',
      },
    };
    const first = generateSymmetricMap(opts);
    expect(typeof opts.balance.mapSeed).toBe('number');
    const second = generateSymmetricMap(opts);
    expect(cellFingerprint(first)).toBe(cellFingerprint(second));
  });
});

describe('generateSymmetricMap — structural invariants', () => {
  const bp = generateSymmetricMap(makeOpts(42));

  it('emits exactly 13 hotspots with the canonical id set', () => {
    expect(bp.hotspots).toHaveLength(13);
    const ids = bp.hotspots.map((h) => h.id).sort();
    const expected = [
      'hs-center',
      'hs-contested-e',
      'hs-contested-n',
      'hs-contested-s',
      'hs-contested-w',
      'hs-natural-ne',
      'hs-natural-nw',
      'hs-natural-se',
      'hs-natural-sw',
      'hs-near-ne',
      'hs-near-nw',
      'hs-near-se',
      'hs-near-sw',
    ].sort();
    expect(ids).toEqual(expected);
  });

  it('emits exactly 4 spawns, one per faction', () => {
    expect(bp.spawns).toHaveLength(4);
    const factions = bp.spawns.map((s) => s.faction).sort();
    expect(factions).toEqual([...FACTION_IDS].sort());
  });

  it('assigns the correct tier per id prefix', () => {
    const expected: Record<string, HotspotTier> = {
      'hs-center': 'center',
      'hs-contested-n': 'contested',
      'hs-contested-e': 'contested',
      'hs-contested-s': 'contested',
      'hs-contested-w': 'contested',
      'hs-near-nw': 'near',
      'hs-near-ne': 'near',
      'hs-near-se': 'near',
      'hs-near-sw': 'near',
      'hs-natural-nw': 'natural',
      'hs-natural-ne': 'natural',
      'hs-natural-se': 'natural',
      'hs-natural-sw': 'natural',
    };
    for (const h of bp.hotspots) expect(h.tier).toBe(expected[h.id]);
  });

  it('places the centre hotspot on the axis of rotation', () => {
    const centre = bp.hotspots.find((h) => h.id === 'hs-center')!;
    expect(centre.x).toBe(W / 2);
    expect(centre.y).toBe(H / 2);
  });

  it('mirrors rock cells under 4-fold rotational symmetry', () => {
    const halfW = W / 2;
    const halfH = H / 2;
    let checked = 0;
    for (let y = 0; y < halfH; y++) {
      for (let x = 0; x < halfW; x++) {
        const src = bp.cells[y * W + x];
        if (src.terrain !== 'rock') continue;
        const ne = bp.cells[x * W + (W - 1 - y)];
        const se = bp.cells[(H - 1 - y) * W + (W - 1 - x)];
        const sw = bp.cells[(H - 1 - x) * W + y];
        expect(ne.terrain).toBe('rock');
        expect(se.terrain).toBe('rock');
        expect(sw.terrain).toBe('rock');
        checked++;
      }
    }
    // Sanity — scatter + vault walls together produce a non-trivial rock count.
    expect(checked).toBeGreaterThan(20);
  });

  it('produces a non-trivial rock density bounded below the "tendrils squeeze" threshold', () => {
    // MAP.md § 6 names a 10-15% density target but the explicit counts in
    // §§ 6.1-6.2 (~8 clusters + 3 lines per quadrant) land closer to 3%.
    // The bound here just asserts scatter fired and stayed below 25% —
    // matching density to the stated target is OL-608's balance concern.
    let rock = 0;
    let open = 0;
    for (const c of bp.cells) {
      if (c.terrain === 'rock') rock++;
      else if (c.terrain === 'open') open++;
    }
    const density = rock / (rock + open);
    expect(density).toBeGreaterThan(0.02);
    expect(density).toBeLessThan(0.25);
  });
});

describe('generateSymmetricMap — connectivity', () => {
  const bp = generateSymmetricMap(makeOpts(42));

  it('every hotspot is reachable from every spawn via BFS on the passable bitmap', () => {
    const hotspotPositions = new Map<string, [number, number]>();
    for (const h of bp.hotspots) hotspotPositions.set(h.id, [h.x, h.y]);
    for (const spawn of bp.spawns) {
      const visited = new Uint8Array(W * H);
      const queue: Array<[number, number]> = [[spawn.x, spawn.y]];
      visited[spawn.y * W + spawn.x] = 1;
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        const neighbours: Array<[number, number]> = [
          [x, y - 1],
          [x + 1, y],
          [x, y + 1],
          [x - 1, y],
        ];
        for (const [nx, ny] of neighbours) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (visited[ni] || !bp.passable[ni]) continue;
          visited[ni] = 1;
          queue.push([nx, ny]);
        }
      }
      for (const [id, [hx, hy]] of hotspotPositions) {
        expect(visited[hy * W + hx]).toBe(1);
        void id;
      }
      const factions: FactionId[] = [...FACTION_IDS];
      void factions;
    }
  });
});

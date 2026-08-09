/**
 * Dispatch spec — what an activation REPORTS, not how hard it hits.
 *
 * `tickRotation` is pure over `(devices, dt, origin, heading, specimens, …)`, so
 * this drives it directly rather than through the assembled engine: the whole
 * point is to pin a shape against a heading, which a live floor cannot be asked
 * to arrange. No magnitudes — damage numbers are `../../balance/arena-probe.ts`'s
 * to print.
 */

import { describe, expect, it } from 'vitest';
import { tickRotation } from './dispatch';
import { DEVICES } from '../../data/devices';
import type { ArenaParams, DeviceRuntime, Specimen } from './types';

const CONE = DEVICES.find((d) => d.shape === 'cone')!;
const PULSE = DEVICES.find((d) => d.shape === 'pulse')!;

const params: ArenaParams = {
  engage: 1,
  eta: 1,
  speedMul: 1,
  dpsMul: 1,
  toughnessMul: 1,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: () => 0.5,
};

const origin = { x: 0, y: 0 };

/** Specimens strung out along +x, well inside any device's reach. */
function ahead(count: number): Specimen[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    tierId: 'x',
    hp: 1e9,
    speed: 0,
    contactDamage: 0,
    moteYield: 0,
    spawnedAt: 0,
    x: 20 + i * 4,
    y: 0,
  }));
}

/** A device armed to fire on the next tick. */
const armed = (defId: string): DeviceRuntime[] => [{ defId, level: 1, timer: 0 }];

describe('survivor/dispatch — activation reporting', () => {
  it('reports a whiffed directional fire rather than dropping it', () => {
    const away = tickRotation(
      armed(CONE.id),
      1,
      origin,
      { x: -1, y: 0 },
      ahead(6),
      new Map(),
      params,
    );

    // The activation exists, names its reach, and hits nothing — a device firing
    // at floor it is not facing is invisible in kill counts and only ever shows
    // up as a shape that quietly under-delivers.
    expect(away).toHaveLength(1);
    expect(away[0].fires).toBeGreaterThan(0);
    expect(away[0].reachable).toBeGreaterThan(0);
    expect(away[0].targets).toHaveLength(0);
  });

  it('reaches the same specimens whichever way a radial shape faces', () => {
    const specimens = ahead(6);
    const forward = tickRotation(
      armed(PULSE.id),
      1,
      origin,
      { x: 1, y: 0 },
      specimens,
      new Map(),
      params,
    );
    const backward = tickRotation(
      armed(PULSE.id),
      1,
      origin,
      { x: -1, y: 0 },
      specimens,
      new Map(),
      params,
    );

    // The control the per-device table is read against: a pulse can only lose
    // targets to `maxTargets`, never to orientation.
    expect(forward[0].targets.length).toBe(backward[0].targets.length);
    expect(forward[0].targets.length).toBeGreaterThan(0);
  });

  it('counts specimens in reach before the shape filter takes its share', () => {
    const specimens = ahead(6);
    const facing = tickRotation(
      armed(CONE.id),
      1,
      origin,
      { x: 1, y: 0 },
      specimens,
      new Map(),
      params,
    );

    expect(facing[0].reachable).toBe(specimens.length);
    expect(facing[0].targets.length).toBeLessThanOrEqual(facing[0].reachable);
  });
});

/**
 * Wall + defense-resolution spec (studio/open-loop-starter#21 leaf 3, step 2).
 *
 * Two layers:
 *   • the wall as a bounded HP buffer — damage clamps to breach, repair caps at max;
 *   • the DEFENSE RESOLUTION driven through the leaf-1 salvo schedule over the REAL
 *     board's clear-rate C and MW surplus (the shipping build + wall modules, driven
 *     by the harness — sim and game can't drift). Behavioral, not magnitude: the
 *     wall gives a bounded Δ_wall tail past the salvo crossing, repair extends it,
 *     and under-building C relative to the pegged reach breaches early (the
 *     C-vs-output tradeoff biting). Absolute (ι, ρ, δ, L_HP) calibration stays a
 *     Lane-3 discovery (multiverse-hr#17); the shapes locked here survive retunes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, build, wall } from './harness';
import { DEFENSE_BALANCE } from '../data/defense';
import type { BuildApi, WallApi } from '../modules';
import type { PieceKind } from '../data/pieces';

const { headroom: H, salvoBase: g, lineHP } = DEFENSE_BALANCE;
const crossingWave = Math.log(H) / Math.log(g); // salvo overtakes C at log_g(H)

/** Place a list of [x, y, kind] entries on the board. */
function place(b: BuildApi, entries: ReadonlyArray<readonly [number, number, PieceKind]>): void {
  for (const [x, y, kind] of entries) b.placeAt(x, y, kind);
}

// A competent defense: a forward Lance line boosted by a Relay row, Reactors behind.
const STRONG: ReadonlyArray<readonly [number, number, PieceKind]> = [
  [0, 0, 'lance'],
  [1, 0, 'lance'],
  [2, 0, 'lance'],
  [3, 0, 'lance'],
  [0, 1, 'relay'],
  [1, 1, 'relay'],
  [2, 1, 'relay'],
  [3, 1, 'relay'],
  [0, 2, 'reactor'],
  [1, 2, 'reactor'],
  [2, 2, 'reactor'],
  [3, 2, 'reactor'],
  [0, 3, 'reactor'],
  [1, 3, 'reactor'],
  [2, 3, 'reactor'],
  [3, 3, 'reactor'],
];
// Under-built defense: fewer Lances → lower realized C.
const WEAK: ReadonlyArray<readonly [number, number, PieceKind]> = [
  [0, 0, 'lance'],
  [1, 0, 'lance'],
  [0, 1, 'relay'],
  [1, 1, 'relay'],
  [0, 2, 'reactor'],
  [1, 2, 'reactor'],
  [2, 2, 'reactor'],
  [3, 2, 'reactor'],
];

/**
 * Walk the exogenous salvo schedule over the shipping wall module. Each wave:
 * STANDBY repairs `repairPerWave` MW → HP, then the salvo's leak-through
 * `max(0, W_N − C)` bleeds the line. Returns the wave the line breaches on.
 */
function walkToBreach(
  w: WallApi,
  C: number,
  w0: number,
  repairPerWave: number,
  maxHp = lineHP,
): number {
  w.resetRun(maxHp);
  for (let n = 0; n < 60; n++) {
    if (n > 0) w.repair(repairPerWave);
    const salvo = w0 * Math.pow(g, n);
    if (w.applyLeak(Math.max(0, salvo - C))) return n;
  }
  return 60;
}

describe('wall — the bounded HP buffer', () => {
  beforeEach(() => boot());

  it('damage reduces HP and breaches at ≤ 0; repair caps at max', () => {
    const w = wall();
    w.resetRun(500);
    expect(w.applyLeak(200)).toBe(false);
    expect(w.hp.value).toBe(300);
    w.repair(1000); // over-repair clamps at max
    expect(w.hp.value).toBe(500);
    expect(w.applyLeak(500)).toBe(true); // exhausted → breach
    expect(w.breached.value).toBe(true);
    expect(w.integrity.value).toBe(0);
  });

  it('resetRun restores the line to a fresh max (the Redeploy re-peg)', () => {
    const w = wall();
    w.resetRun(500);
    w.applyLeak(400);
    w.resetRun(800);
    expect(w.hp.value).toBe(800);
    expect(w.max.value).toBe(800);
    expect(w.breached.value).toBe(false);
  });
});

describe('defense resolution — the wall gives a bounded Δ_wall tail', () => {
  beforeEach(() => boot());

  it('a competent board survives past the salvo crossing; the wall is the tail', () => {
    const b = build();
    place(b, STRONG);
    const C = b.clearRate.value.toNumber();
    const surplus = b.mwSurplus.value.toNumber();
    const w0 = C / H; // pegged to this board's reach

    const withWall = walkToBreach(wall(), C, w0, surplus, lineHP);
    const noWall = walkToBreach(wall(), C, w0, surplus, 1); // no buffer

    expect(withWall).toBeGreaterThan(crossingWave); // survives the crossing (Δ_wall ≥ 1)
    expect(withWall).toBeGreaterThan(noWall); // the wall is what buys the tail
    expect(withWall - crossingWave).toBeLessThan(8); // bounded — leak is geometric
  });

  it('repair extends the tail (surplus routed to the line buys waves)', () => {
    const b = build();
    place(b, STRONG);
    const C = b.clearRate.value.toNumber();
    const surplus = b.mwSurplus.value.toNumber();
    const w0 = C / H;

    const repaired = walkToBreach(wall(), C, w0, surplus, lineHP);
    const unrepaired = walkToBreach(wall(), C, w0, 0, lineHP);
    expect(repaired).toBeGreaterThanOrEqual(unrepaired);
  });

  it('under-building C relative to the pegged reach breaches early (the tradeoff)', () => {
    const b = build();
    place(b, STRONG);
    const cStrong = b.clearRate.value.toNumber();
    const w0 = cStrong / H; // salvo pegged to the strong reach

    const strongBreach = walkToBreach(wall(), cStrong, w0, b.mwSurplus.value.toNumber(), lineHP);

    boot();
    const b2 = build();
    place(b2, WEAK);
    const cWeak = b2.clearRate.value.toNumber();
    expect(cWeak).toBeLessThan(cStrong); // fewer Lances → less clear-rate
    const weakBreach = walkToBreach(wall(), cWeak, w0, b2.mwSurplus.value.toNumber(), lineHP);

    expect(weakBreach).toBeLessThan(strongBreach); // under-built → the line falls sooner
  });
});

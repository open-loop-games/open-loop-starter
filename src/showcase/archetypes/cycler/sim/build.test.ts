/**
 * Cycler build module — shape-invariant spec (IDENTITY § Balance model; the leaf-2
 * board concretization, studio/open-loop-starter#21).
 *
 * Behavioral, not magnitude. Pins WHAT the shared placement grid does:
 *   • the board is REAL now — Reactors produce, Relays boost cross-adjacent
 *     Reactors, and the realized output flows from a live evaluator over occupancy;
 *   • the LEAF-2 LOCK — the reference full board's realized output ≈ the closed-form
 *     ceiling D_max (the two models agree at the reference point);
 *   • D_max stays the authored closed form (finite board ⇒ log crossing) and is
 *     geometric in the permanent level L (reach, not pacing);
 *   • the kernel still pegs against D_max and crosses at N* on live capacity.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, getEngine, tickUntil } from './harness';
import { BuildKey, getBuild } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { PIECES } from '../data/pieces';

const closedFormDMax =
  BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost;

describe('build — the shared placement grid is real', () => {
  beforeEach(() => boot());

  it('an empty board produces nothing', () => {
    const b = getEngine().tryInject(BuildKey)!;
    expect(b.placed.value).toBe(0);
    expect(b.capacity.value.toNumber()).toBe(0);
  });

  it('a Relay boosts cross-adjacent Reactors (additive), not itself', () => {
    const b = getBuild();
    // A lone Reactor: base output, no synergy.
    expect(b.placeAt(1, 1, 'reactor')).toBe(true);
    expect(b.capacity.value.toNumber()).toBeCloseTo(PIECES.reactor.output!, 6);

    // A Relay cross-adjacent lifts it by +boost; the Relay itself yields nothing.
    expect(b.placeAt(1, 0, 'relay')).toBe(true);
    expect(b.capacity.value.toNumber()).toBeCloseTo(
      PIECES.reactor.output! * (1 + PIECES.relay.boost!),
      6,
    );
    expect(b.placed.value).toBe(2); // the Relay occupies a cell but adds no output
  });

  it('the finite board hard-caps placement — the saturation source', () => {
    const b = getBuild();
    for (let i = 0; i < b.boardCells + 3; i++) b.placeProducer();
    expect(b.placed.value).toBe(b.boardCells);
    expect(b.placeProducer()).toBe(false); // no cell left to place on
  });

  it('placement preview equals the realized board after placing (same pure fn)', () => {
    const b = getBuild();
    b.placeAt(1, 1, 'reactor');
    const previewed = b.preview('relay', 1, 0).total;
    b.placeAt(1, 0, 'relay');
    expect(b.evaluation.value.total).toBeCloseTo(previewed, 6);
  });
});

describe('build — the reference board reconciles with the closed-form ceiling', () => {
  beforeEach(() => boot());

  it('a filled reference board realizes ≈ D_max (the leaf-2 lock)', () => {
    const b = getBuild();
    b.fillBoard();
    expect(b.placed.value).toBe(b.boardCells); // every cell occupied
    const ratio = b.capacity.value.div(b.dMax.value).toNumber();
    expect(Math.abs(1 - ratio)).toBeLessThan(0.03); // realized within 3% of D_max
  });

  it('D_max is the authored closed form and geometric in the permanent level L', () => {
    const b = getBuild();
    expect(b.dMax.value.toNumber()).toBeCloseTo(closedFormDMax, 6);
    const d0 = b.dMax.value;
    b.raisePower();
    const d1 = b.dMax.value;
    b.raisePower();
    const d2 = b.dMax.value;
    expect(d1.div(d0).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
    expect(d2.div(d1).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
  });
});

describe('build ↔ kernel integration — the crossing holds on the ceiling', () => {
  beforeEach(() => boot());

  it('the kernel pegs against the live build D_max and crosses at N*', async () => {
    expect(cycle().capacity.value.eq(getBuild().dMax.value)).toBe(true);

    const c = cycle();
    await tickUntil(() => c.runState.value === 'ended');
    expect(c.endedAtMinutes.value!).toBeCloseTo(c.predictedRunLength(), 1);
  });

  it('raising build power re-pegs to +0 run length (reach, not pacing)', async () => {
    const base = (await runToEnd()).endedAtMinutes.value!;

    boot();
    getBuild().raisePower();
    cycle().startRun();
    const powered = (await runToEnd()).endedAtMinutes.value!;

    expect(getBuild().dMax.value.toNumber()).toBeGreaterThan(closedFormDMax);
    expect(Math.abs(powered - base)).toBeLessThan(0.05);
  });
});

async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended');
  return c;
}

/**
 * Cycler build module — shape-invariant spec (IDENTITY § Balance model; the leaf-2
 * board concretization + leaf-3 clear-rate/repair ceilings, studio/open-loop-starter#21).
 *
 * Behavioral, not magnitude. Pins WHAT the shared placement grid does:
 *   • the board is REAL — Reactors produce, Relays boost cross-adjacent receivers,
 *     realized output/clear-rate flow from a live evaluator over occupancy;
 *   • the LEAF-2 LOCK — the reference full board's realized output ≈ D_max;
 *   • dMax / cMax are the authored closed forms (finite board ⇒ log crossing),
 *     geometric in the permanent level L (reach, not pacing);
 *   • Bulwarks are repair-only — they contribute nothing to output/clear-rate but
 *     add repair throughput;
 *   • the kernel pegs the salvo against cMax and the run ends at the line breach.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, wall, getEngine, placeDefense, tickUntil } from './harness';
import { BuildKey, getBuild } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { DEFENSE_BALANCE } from '../data/defense';
import { PIECES } from '../data/pieces';

const closedFormDMax =
  BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost;
const closedFormCMax =
  DEFENSE_BALANCE.forwardCells * DEFENSE_BALANCE.lanceIntercept * BUILD_BALANCE.adjacencyBoost;

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

describe('build — the clear-rate + repair ceilings (leaf 3)', () => {
  beforeEach(() => boot());

  it('cMax is the authored clear-rate closed form and geometric in the permanent level L', () => {
    const b = getBuild();
    expect(b.cMax.value.toNumber()).toBeCloseTo(closedFormCMax, 6);
    const c0 = b.cMax.value;
    b.raisePower();
    expect(b.cMax.value.div(c0).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
  });

  it('a Bulwark contributes nothing to output or clear-rate — repair only', () => {
    const b = getBuild();
    b.placeAt(1, 1, 'reactor');
    const outWithReactor = b.capacity.value.toNumber();
    // Add a Bulwark: output and clear-rate are unchanged; it is not a boost receiver.
    b.placeAt(2, 2, 'bulwark');
    expect(b.capacity.value.toNumber()).toBeCloseTo(outWithReactor, 6);
    expect(b.clearRate.value.toNumber()).toBe(0);
    expect(b.bulwarkCount.value).toBe(1);
  });

  it('repairCapacity = (baseRepair + n·throughput)·power', () => {
    const b = getBuild();
    const beta = PIECES.bulwark.throughput!;
    expect(b.repairCapacity.value.toNumber()).toBeCloseTo(DEFENSE_BALANCE.baseRepair, 6); // empty: baseline trickle
    b.placeAt(0, 0, 'bulwark');
    b.placeAt(1, 0, 'bulwark');
    expect(b.repairCapacity.value.toNumber()).toBeCloseTo(DEFENSE_BALANCE.baseRepair + 2 * beta, 6);
    b.raisePower();
    expect(b.repairCapacity.value.toNumber()).toBeCloseTo(
      (DEFENSE_BALANCE.baseRepair + 2 * beta) * BUILD_BALANCE.producerUpgradeRatio,
      6,
    );
  });
});

describe('build ↔ kernel integration — the salvo pegs against cMax, breach ends the run', () => {
  beforeEach(() => boot());

  it('the kernel HUD ceiling is build cMax; a placed board runs to the line breach', async () => {
    expect(cycle().capacity.value.eq(getBuild().cMax.value)).toBe(true);

    const c = cycle();
    placeDefense();
    await tickUntil(() => c.runState.value === 'ended', 20_000);
    expect(wall().breached.value).toBe(true); // the line breach IS the run-end
    expect(c.endedAtMinutes.value!).toBeGreaterThan(0);
  });

  it('raising build power re-pegs to +0 run length (reach, not pacing)', async () => {
    placeDefense();
    const baseC = getBuild().cMax.value;
    const base = (await runToEnd()).endedAtMinutes.value!;

    getBuild().raisePower();
    cycle().startRun(); // re-peg; board persists (startRun doesn't clear it)
    const powered = (await runToEnd()).endedAtMinutes.value!;

    expect(getBuild().cMax.value.gt(baseC)).toBe(true); // reach genuinely climbed
    expect(Math.abs(powered - base)).toBeLessThan(0.1);
  });
});

async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended', 20_000);
  return c;
}

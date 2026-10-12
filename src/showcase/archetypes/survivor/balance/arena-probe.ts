/**
 * Survivor — arena probe: does the arc actually play, and what is η really?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/arena-probe.ts`
 *
 * Drives the REAL assembled engine — the shipping `survivor/arena` module, its
 * pure step, its steering policy — headless, per `.claude/rules/archetype-authoring.md`
 * § Balance. A probe prints; it does not assert. A probe that disagrees with the
 * projection has done its job.
 *
 * This is the archetype's walkthrough check: the first surface that walks
 * spawn → steer → fire → drop → collect → contact end to end. Structural defects
 * surface here, not in the module unit tests.
 *
 * The headline number is **measured η against assumed η**. The closed form
 * (`../data/income.ts`) takes η as given because it is a policy output, so a run
 * that misses its schedule is either badly balanced or badly piloted and those
 * look identical from outside. This is the reading that separates them.
 *
 * **One seed, read in depth.** Everything below is a single arc per seat, which
 * is what makes the per-device breakdown legible and what makes every number
 * here a point rather than an estimate. `./spread-probe.ts` runs the same
 * fixture across a seed batch and is the surface to read before believing any
 * figure on this one.
 */

import { MINUTES, INTERVAL_RATE, clock, col, runArc, type ArcResult } from './_arc';
import { SEATS } from '../data/seats';
import { meanMoteYield } from '../data/specimens';
import { localDensity, spawnRate } from '../data/arena';
import { DEVICES } from '../data/devices';

/** The seed the depth read is taken on. `./spread-probe.ts` owns the batch. */
const SEED = 12345;

async function main(): Promise<void> {
  console.log('Survivor — arena probe (shipping module, headless)');
  console.log(`${MINUTES} sim-minutes per seat at ${INTERVAL_RATE} Hz.\n`);

  /**
   * Kills the closed form expects over the window the run ACTUALLY lasted.
   * Comparing against the full window would just re-report that the run ended
   * early, which the outcome column already says.
   */
  const expectedKills = (engage: number, until: number): number => {
    let k = 0;
    for (let t = 0; t < until; t += 0.5) k += spawnRate(t) * engage * 0.5;
    return k;
  };

  console.log(
    col('  seat', 13) +
      col('bind', 22) +
      col('ends', 8) +
      col('lvl', 6) +
      col('sched', 8) +
      col('dev', 6) +
      col('evo', 6) +
      col('kills/s', 10) +
      col('pred', 8) +
      col('engage', 10) +
      col('reach', 8) +
      col('lethal', 8) +
      col('η cont', 9) +
      col('η all', 8) +
      col('coll', 7) +
      'burst',
  );

  // Realized engagement against the dial. `engage` is DEFINED as the share of
  // spawns brought inside `r_kill` (`../data/arena.ts` § Density), so kills over
  // spawns measures it directly — and the whole income model is built on the
  // declared figure.
  const seatOf = (id: string) => SEATS.find((x) => x.id === id)!;
  const results: ArcResult[] = [];
  for (const seat of SEATS) {
    const r = await runArc(seat.id, SEED);
    results.push(r);
    const predicted = expectedKills(seat.engage, r.elapsed);
    console.log(
      col(`  ${r.seatId}`, 13) +
        col(r.bindingCause, 22) +
        col(clock(r.elapsed), 8) +
        col(r.level.toString(), 6) +
        col(`${r.scheduleDelta > 0 ? '+' : ''}${r.scheduleDelta}`, 8) +
        col(r.devices.toString(), 6) +
        col(r.evolved.toString(), 6) +
        col((r.kills / Math.max(1, r.elapsed)).toFixed(2), 10) +
        col((predicted / Math.max(1, r.elapsed)).toFixed(2), 8) +
        col(
          `${(r.kills / Math.max(1, r.spawned)).toFixed(2)}/${seatOf(r.seatId).engage.toFixed(2)}`,
          10,
        ) +
        col((r.reached / Math.max(1, r.spawned)).toFixed(2), 8) +
        col((r.kills / Math.max(1, r.reached)).toFixed(2), 8) +
        col(r.etaContinuous.toFixed(3), 9) +
        col(r.etaMeasured.toFixed(3), 8) +
        col(`${r.collectorsTaken}/${r.collectorsDropped}`, 7) +
        `${(r.burstShare * 100).toFixed(1)}%`,
    );
  }

  console.log('\n  ── Live census, unbounded ──');
  console.log(
    col('  seat', 13) +
      col('peak', 8) +
      col('peak at', 10) +
      col('at 10:00', 11) +
      col('modelled', 11) +
      col('motes left', 13) +
      'spawned',
  );
  for (const r of results) {
    console.log(
      col(`  ${r.seatId}`, 13) +
        col(r.peakSpecimens, 8) +
        col(clock(r.peakAt), 10) +
        col(r.liveAt10, 11) +
        col(localDensity(600, seatOf(r.seatId).engage, seatOf(r.seatId).dps).toFixed(0), 11) +
        col(r.liveMotes, 13) +
        r.spawned,
    );
  }

  // ── Per-device dispatch ──
  //
  // Aggregate kills/s cannot say which device delivered them, and the shapes fail
  // in different ways. `connect` is the share of shots that found any target at
  // all; `capture` is hits over specimens IN REACH at fire time, so a directional
  // shape's orientation loss and a radial shape's `maxTargets` cap read as
  // different numbers instead of one blurred "it underperforms". `pulse` is the
  // control: radial, so it can only ever lose to the cap.
  console.log('\n  ── Per-device dispatch ──');
  console.log(
    col('  seat', 13) +
      col('device', 18) +
      col('shape', 8) +
      col('lvl', 6) +
      col('connect', 10) +
      col('capture', 10) +
      col('hits/fire', 11) +
      col('kill share', 12) +
      'dps',
  );
  const pct = (n: number, d: number): string => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');
  for (const r of results) {
    for (const inst of r.installed) {
      const d = r.deviceStats[inst.defId];
      const def = DEVICES.find((x) => x.id === inst.defId);
      if (!d || !def) continue;
      console.log(
        col(`  ${r.seatId}`, 13) +
          col(inst.defId, 18) +
          col(def.shape, 8) +
          col(`${inst.level}${inst.evolved ? '*' : ''}`, 6) +
          col(pct(d.firesConnected, d.fires), 10) +
          col(pct(d.hits, d.reachable), 10) +
          col((d.hits / Math.max(1, d.firesConnected)).toFixed(1), 11) +
          col(pct(d.kills, r.kills), 12) +
          (d.damage / Math.max(1, r.elapsed)).toFixed(1),
      );
    }
  }

  // A ledger of open findings used to be printed here. It went stale — three of
  // its seven items described a ceiling that had been deleted and an η that had
  // moved — because it was a second copy of `../BALANCING.md` § Known thin with
  // nothing keeping the two in step. The findings have one home; this prints
  // what THIS run measured and says how far a single seed can be trusted.
  console.log('\n  ── Reading ──');
  console.log(`  One seed (${SEED}). Every figure above is a point, not an estimate: the`);
  console.log('  spine stops its closed form at a stochastic draft and a policy-output η');
  console.log('  (`../IDENTITY.md` § Rate-function spine), so a single arc cannot say');
  console.log('  whether a seat is bound by its design or by its draw. Run');
  console.log('  `./spread-probe.ts` for the distribution before acting on anything here');
  console.log('  — measured, this seed sits at the favourable end for at least one seat.');
  console.log('\n  What this probe is still the right surface for: the per-device');
  console.log('  breakdown above, which needs one legible run rather than a median, and');
  console.log('  the census against `localDensity`. Open findings live in');
  console.log('  `../BALANCING.md` § Known thin.');
  console.log(`\n  Mean mote yield over the window: ${meanMoteYield(MINUTES * 30).toFixed(2)}.`);
}

main();

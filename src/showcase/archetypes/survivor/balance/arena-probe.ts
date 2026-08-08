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
 * This is the archetype's walkthrough gate: the first surface that walks
 * spawn → steer → fire → drop → collect → contact end to end. Structural defects
 * surface here, not in the module unit tests.
 *
 * The headline number is **measured η against assumed η**. The closed form
 * (`../data/income.ts`) takes η as given because it is a policy output, so a run
 * that misses its schedule is either badly balanced or badly piloted and those
 * look identical from outside. This is the reading that separates them.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { ArenaKey, DraftKey, RunKey, createSurvivorModules } from '../modules';
import { SEATS } from '../data/seats';
import { meanMoteYield } from '../data/specimens';
import { THREAT_BALANCE, spawnRate } from '../data/arena';

/** 5 ticks per sim-second — coarse enough to be quick, fine enough to steer. */
const TICK_RATE = 5;
const MINUTES = 30;

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const clock = (t: number): string => {
  const total = Math.round(t);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

async function runSeat(seatId: string, seed: number) {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    tickRate: TICK_RATE,
    namespacePrefix: `survivor-arena-${seatId}-${seed}`,
  });
  const arena = handle.engine.tryInject(ArenaKey);
  const run = handle.engine.tryInject(RunKey);
  const draft = handle.engine.tryInject(DraftKey);
  if (!arena || !run || !draft) throw new Error('arena-probe: survivor modules did not provide');

  run.startRun(seatId);

  // Ticked a minute at a time rather than in one call so the live census can be
  // SAMPLED. `entityBudget` is a suspected binding density term past mid-run
  // (`../BALANCING.md` § Known thin), and from end-of-run totals a floor pinned
  // at the cap for half the arc is indistinguishable from one that never reached
  // it — the spawn loop simply stops, and every downstream term the projection
  // reads off density goes on quoting a curve the sim abandoned.
  let peakSpecimens = 0;
  let minutesAtCap = 0;
  let firstCapAt: number | null = null;
  for (let m = 0; m < MINUTES; m++) {
    await handle.tick(60 * TICK_RATE);
    const live = arena.state.value;
    peakSpecimens = Math.max(peakSpecimens, live.specimens.length);
    if (live.specimens.length >= THREAT_BALANCE.entityBudget) {
      minutesAtCap++;
      if (firstCapAt === null) firstCapAt = live.time;
    }
    if (arena.outcome.value !== 'running') break;
  }

  const s = arena.state.value;
  const stats = s.stats;
  handle.dispose();

  const etaMeasured = stats.motesDropped > 0 ? stats.motesBanked / stats.motesDropped : 0;
  // η split into its two channels, which is what `../BALANCING.md` § Running a
  // pass asks for: continuous pickup is the policy's doing, burst share is the
  // collector's. A single η conflates a good pilot with a lucky drop.
  const etaContinuous =
    stats.motesDropped > 0
      ? (stats.motesBanked - stats.motesCollectedByCollector) / stats.motesDropped
      : 0;
  const burstShare =
    stats.motesBanked > 0 ? stats.motesCollectedByCollector / stats.motesBanked : 0;
  return {
    seatId,
    level: run.level.value,
    bindingCause: run.bindingCause.value,
    scheduleDelta: run.scheduleDelta.value,
    picks: draft.taken.value,
    devices: s.devices.length,
    evolved: s.devices.filter((d) => d.evolutionId).length,
    outcome: arena.outcome.value,
    elapsed: s.time,
    kills: stats.kills,
    dropped: stats.motesDropped,
    banked: stats.motesBanked,
    etaMeasured,
    etaContinuous,
    burstShare,
    collectorsTaken: stats.collectorsTaken,
    collectorsDropped: s.collectorsDropped,
    peakSpecimens,
    minutesAtCap,
    firstCapAt,
    liveSpecimens: s.specimens.length,
    liveMotes: s.motes.length,
    contactSeconds: stats.contactSeconds,
    hpLeft: Math.max(0, s.operator.hp),
    hpMax: s.operator.maxHp,
  };
}

async function main(): Promise<void> {
  console.log('Survivor — arena probe (shipping module, headless)');
  console.log(`${MINUTES} sim-minutes per seat at ${TICK_RATE} Hz.\n`);

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
      col('η cont', 9) +
      col('η all', 8) +
      col('coll', 7) +
      'burst',
  );

  const results: Awaited<ReturnType<typeof runSeat>>[] = [];
  for (const seat of SEATS) {
    const r = await runSeat(seat.id, 12345);
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
        col(r.etaContinuous.toFixed(3), 9) +
        col(r.etaMeasured.toFixed(3), 8) +
        col(`${r.collectorsTaken}/${r.collectorsDropped}`, 7) +
        `${(r.burstShare * 100).toFixed(1)}%`,
    );
  }

  console.log(`\n  ── Live census against the ${THREAT_BALANCE.entityBudget}-entity budget ──`);
  console.log(
    col('  seat', 13) +
      col('peak', 8) +
      col('first at cap', 15) +
      col('min at cap', 13) +
      'motes left',
  );
  for (const r of results) {
    console.log(
      col(`  ${r.seatId}`, 13) +
        col(r.peakSpecimens, 8) +
        col(r.firstCapAt === null ? '—' : clock(r.firstCapAt), 15) +
        col(r.minutesAtCap, 13) +
        r.liveMotes,
    );
  }

  console.log('\n  ── Reading ──');
  console.log('  The full arc runs. Seats survive minutes rather than seconds, they');
  console.log('  draft the whole rotation, and binding causes DIFFER across seats');
  console.log('  — which is the target distribution, not a single wall in costume.');
  console.log('\n  Kills/s now tracks the closed form within a seat-width, and the');
  console.log('  schedule deficit closed to a few beats, because `engage` finally');
  console.log('  reaches the movement policy as a term rather than as an orbit');
  console.log('  distance (`../modules/sim/steering.ts` § ENGAGE_WEIGHT). The ladder,');
  console.log('  the escalation curves and the income model are all untouched: they are');
  console.log('  the target, and what has been corrected is the pilot and the geometry.');
  console.log('\n  Open, and recorded in `../BALANCING.md` § Known thin:');
  console.log('   1. η is no longer ~1.0 — bounding the aperture moved it — but it is');
  console.log('      still ~0.91–0.99 against an assumed 0.65–0.78, and the residual is');
  console.log('      NOT geometry. Motes never expire and the policy routes to them, so');
  console.log('      η is "did you ever pick it up" over a 30-minute run, which tends to');
  console.log('      1 by construction. Only abandonment lowers it.');
  console.log('   2. The collector fires and every drop is taken — and it is worth 0.2–1%');
  console.log('      of income against a modelled 11%. Its whole yield is a share of the');
  console.log('      UNCOLLECTED pool, and at η ≈ 0.95 that pool barely exists. Nothing');
  console.log('      is wrong with the pull; it is downstream of finding 1.');
  console.log('   3. `entityBudget` binds, and it is not a corner case. The census above');
  console.log('      shows seats pinned at 400 for 7–19 of 30 minutes, earliest at 12:00.');
  console.log('      Past that the spawn loop stops and density is set by a PERFORMANCE');
  console.log('      budget while `localDensity` goes on compounding — so every term the');
  console.log('      projection reads off density is quoting a curve the sim abandoned.');
  console.log('      Lowest-DPS seat caps earliest and stays longest, which is the');
  console.log('      feedback loop: slow kills fill the floor, a full floor is clamped.');
  console.log('   4. Evolutions land 1 per seat against a pool sized for 2–3');
  console.log('      (`../data/devices.ts` § Cardinality); suspect the DRAW, not the policy.');
  console.log(`\n  Mean mote yield over the window: ${meanMoteYield(MINUTES * 30).toFixed(2)}.`);
}

main();

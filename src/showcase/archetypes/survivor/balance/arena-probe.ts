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
import { spawnRate } from '../data/arena';

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
  await handle.tick(MINUTES * 60 * TICK_RATE);

  const s = arena.state.value;
  const stats = s.stats;
  handle.dispose();

  const etaMeasured = stats.motesDropped > 0 ? stats.motesBanked / stats.motesDropped : 0;
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
      'η meas',
  );

  for (const seat of SEATS) {
    const r = await runSeat(seat.id, 12345);
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
        r.etaMeasured.toFixed(3),
    );
  }

  console.log('\n  ── Reading ──');
  console.log('  The full arc runs. Seats survive minutes rather than seconds, they');
  console.log('  draft the whole rotation, and binding causes now DIFFER across seats');
  console.log('  — which is the target distribution, not a single wall in costume.');
  console.log('\n  Open, and recorded in `../BALANCING.md` § Known thin:');
  console.log('   1. Runs sit BEHIND schedule now, having sat ahead before the');
  console.log('      near-field steering term landed. Kills/s is under the closed');
  console.log('      form: the seats under-engage. The contact cliff is strong and');
  console.log('      wants calibrating against `engage` — a tune, with a probe to');
  console.log('      read it, which is the position this was supposed to reach.');
  console.log('   2. Zero evolutions still. A device needs eight levels and the offer');
  console.log('      draw presents three of ~10 candidates, so the deepest device is');
  console.log('      often not on the table. Suspect the DRAW, not the policy.');
  console.log('   3. η now measures 0.5–0.99 against an assumed 0.6–0.78 — in range');
  console.log('      mid-run, drifting high late as the floor fills with motes. That');
  console.log('      is the instrument working rather than a defect.');
  console.log(`\n  Mean mote yield over the window: ${meanMoteYield(MINUTES * 30).toFixed(2)}.`);
}

main();

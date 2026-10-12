/**
 * Survivor — spread probe: the spine's measured remainder, over a seed batch.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/spread-probe.ts`
 * Seeds: `SEEDS=16 pnpm exec vite-node …/spread-probe.ts` (default 8).
 *
 * `../IDENTITY.md` § Rate-function spine stops the closed form in two named
 * places — the draft is stochastic, and `η` is a policy output — and declares
 * what measures the rest: **seeded multi-run distribution statistics per
 * persona**, being median survival, `η` split into continuous pickup and
 * collector burst, and the distribution of **binding cause** at run end.
 *
 * This is that instrument. `./arena-probe.ts` reads one seed in depth and is
 * the surface for "what happened in this run"; nothing on it is an estimate,
 * because one sample never is. Read this one before believing a figure there.
 *
 * It is also where the **beat windows** come from. `./beats.ts` defines the six
 * turns of an arc as extractors over a finished run; this probe reports the
 * observed range of each across the batch and prints a paste-ready block for
 * `../manifest.ts`. A window is RECORDED from runs, never authored as a target
 * (`@/types` § BeatRef), and a one-seed window is not a window.
 *
 * The target it checks is stated in the same section: *three specialists each
 * bound by a different cause, with the baseline mostly reaching the timer.* A
 * seat whose cause is the same on every seed is a wall in costume however
 * well-tuned the constant behind it is, and `modal` is the column that says so.
 *
 * Cost: one arc is ~13s, so the default batch is ~7 minutes for the roster. It
 * is a discovery script and prints; it does not assert.
 */

import {
  categorySpreadOf,
  formatCategorySpread,
  formatSpread,
  seedBatch,
  spreadOf,
} from '@/balance';
import { MINUTES, clock, col, runArc, type ArcResult } from './_arc';
import { SURVIVOR_BEATS } from './beats';
import { SEATS } from '../data/seats';
import { notesForRun } from '../data/meta';
import { HP_MILESTONES } from '../modules/sim/types';

const SEED_COUNT = Number(process.env.SEEDS ?? 8);
const seeds = seedBatch(SEED_COUNT);

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
const num = (d: number) => (n: number) => n.toFixed(d);

async function main(): Promise<void> {
  console.log('Survivor — spread probe (shipping module, headless)');
  console.log(
    `${SEED_COUNT} seeds x ${SEATS.length} seats, ${MINUTES} sim-minutes each. ` +
      `Seeds ${seeds[0]}..${seeds[seeds.length - 1]}.\n`,
  );

  // Progress on a rewritten line when someone is watching, one line per seat
  // when the output is piped to a file — a `\r` spinner in a captured log is
  // one unreadable smear across the header it was supposed to precede.
  const live = process.stdout.isTTY === true;
  const bySeat = new Map<string, ArcResult[]>();
  for (const seat of SEATS) {
    const runs: ArcResult[] = [];
    for (const seed of seeds) {
      runs.push(await runArc(seat.id, seed));
      if (live) process.stdout.write(`  ${seat.id} ${runs.length}/${SEED_COUNT}\r`);
    }
    if (live) process.stdout.write(`${' '.repeat(40)}\r`);
    else console.log(`  ran ${seat.id} x${SEED_COUNT}`);
    bySeat.set(seat.id, runs);
  }
  if (!live) console.log('');

  // ── Survival and the binding-cause distribution ──
  //
  // The two readings the spine names as its remainder, side by side because
  // they answer one question together: a seat that dies early for a DIFFERENT
  // reason each seed is a tuned difficulty, and one that dies early the same
  // way every seed is a wall.
  console.log('  ── Survival and binding cause ──');
  console.log(
    col('  seat', 13) +
      col('ends (median [range])', 24) +
      col('timer', 8) +
      col('modal', 9) +
      'cause distribution',
  );
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const stats = spreadOf(runs, { elapsed: (r) => r.elapsed });
    const causes = categorySpreadOf(runs, (r) => r.bindingCause);
    const timerShare = (causes.counts['timer'] ?? 0) / runs.length;
    console.log(
      col(`  ${seat.id}`, 13) +
        col(formatSpread(stats.elapsed!, clock), 24) +
        col(pct(timerShare), 8) +
        col(pct(causes.modalShare), 9) +
        formatCategorySpread(causes),
    );
  }

  // ── The economy, as a distribution ──
  //
  // `engage` is DEFINED as the share of spawns brought inside `r_kill`
  // (`../data/arena.ts` § Density), so kills over spawns measures it directly
  // against the seat's declared authored parameter. Every income figure in the closed form
  // rides that pair agreeing.
  console.log('\n  ── Economy across the batch ──');
  console.log(
    col('  seat', 13) +
      col('level', 18) +
      col('sched', 18) +
      col('kills/s', 18) +
      col('engage', 18) +
      col('asked', 7) +
      col('reach', 18) +
      col('lethal', 18) +
      col('income', 18) +
      col('modelled', 10) +
      'notes',
  );
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const s = spreadOf(runs, {
      level: (r) => r.level,
      scheduleDelta: (r) => r.scheduleDelta,
      killRate: (r) => r.kills / Math.max(1, r.elapsed),
      engage: (r) => r.kills / Math.max(1, r.spawned),
      reach: (r) => r.reached / Math.max(1, r.spawned),
      lethal: (r) => r.kills / Math.max(1, r.reached),
      // The compound the income model actually rides — kills per spawn times the
      // share of their drops banked. `../data/income.ts` builds it from the two
      // AUTHORED PARAMETERS (`seat.engage * seat.eta`), and both authored parameters diverge from what the
      // policy achieves, in OPPOSITE directions. Only their product reaches
      // income, so it is the product that has to be checked; reading either half
      // alone reports a divergence the other half has already paid for.
      //
      // Per run, never a product of medians — the median of a product is not the
      // product of the medians, and these two are correlated within a run.
      income: (r) => (r.kills / Math.max(1, r.spawned)) * r.etaContinuous,
      // What the run banks toward the shop, which is the lifetime economy's
      // only input and had nothing printing it. `notesForRun` takes kills times
      // the run's MEAN yield, and dropped/kills is that mean exactly — measured
      // over the tier mix the run actually met, rather than modelled at a `t`.
      notes: (r) => notesForRun(r.kills, r.dropped / Math.max(1, r.kills)),
    });
    console.log(
      col(`  ${seat.id}`, 13) +
        col(formatSpread(s.level!, num(0)), 18) +
        col(formatSpread(s.scheduleDelta!, num(0)), 18) +
        col(formatSpread(s.killRate!, num(2)), 18) +
        col(formatSpread(s.engage!, num(2)), 18) +
        col(seat.engage.toFixed(2), 7) +
        col(formatSpread(s.reach!, num(2)), 18) +
        col(formatSpread(s.lethal!, num(2)), 18) +
        col(formatSpread(s.income!, num(3)), 18) +
        // What `../data/income.ts` actually projects from — the seat's MEASURED
        // pair, not its authored parameters. These two columns are a fixed point: `measured`
        // derives the ladder, the ladder changes the run, and the run moves
        // `measured`. Re-copy and re-run until the pair stops moving; the gap
        // between them is the iteration's residual, not a balance defect.
        col((seat.measured.killsPerSpawn * seat.measured.eta).toFixed(3), 10) +
        formatSpread(s.notes!, num(0)),
    );
  }

  // ── η, split ──
  //
  // Continuous pickup is the movement policy's doing; burst share is the
  // collector's. A single η conflates a good pilot with a lucky drop, which is
  // why `../IDENTITY.md` asks for both.
  console.log('\n  ── Collection efficiency ──');
  console.log(col('  seat', 13) + col('η continuous', 20) + col('burst share', 20) + 'motes left');
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const s = spreadOf(runs, {
      etaContinuous: (r) => r.etaContinuous,
      burstShare: (r) => r.burstShare,
      liveMotes: (r) => r.liveMotes,
    });
    console.log(
      col(`  ${seat.id}`, 13) +
        col(formatSpread(s.etaContinuous!, num(3)), 20) +
        col(
          formatSpread(s.burstShare!, (n) => pct(n)),
          20,
        ) +
        formatSpread(s.liveMotes!, num(0)),
    );
  }

  // ── Attrition, which is what a positioning seat is actually claiming ──
  //
  // When a run ENDED is one number arriving after every decision that produced
  // it, and it cannot tell a seat that was grazed early and lasted from one that
  // went untouched and was then caught. The Kineticist's thesis — "never be where
  // it is" — is a claim about the TOP of the HP bar, so that is what this reads:
  // time to the first touch, then to each milestone. `—` means never reached,
  // which for `first hit` is the seat doing exactly what it says.
  console.log('\n  ── Attrition (median sim-time to first hit, then to each HP mark) ──');
  console.log(
    col('  seat', 13) +
      col('first hit', 12) +
      HP_MILESTONES.map((m) => col(`${(m * 100).toFixed(0)}%`, 10)).join('') +
      'untouched runs',
  );
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const median = (pick: (r: ArcResult) => number | null): string => {
      const hit = runs.map(pick).filter((v): v is number => v !== null);
      if (hit.length === 0) return '—';
      const s = spreadOf(hit, { v: (x) => x });
      return clock(s.v!.median);
    };
    const untouched = runs.filter((r) => r.firstDamageAt === null).length;
    console.log(
      col(`  ${seat.id}`, 13) +
        col(
          median((r) => r.firstDamageAt),
          12,
        ) +
        HP_MILESTONES.map((_, i) =>
          col(
            median((r) => r.hpMilestoneAt[i]),
            10,
          ),
        ).join('') +
        `${untouched}/${runs.length}`,
    );
  }

  // ── Beat windows, which is what `../manifest.ts` carries ──
  //
  // Recorded from the batch, never authored as a target (`@/types` § BeatRef).
  // The window is the full OBSERVED range across every seat and seed, which is
  // what that field means — a percentile band would be a nicer number and a
  // different claim. `lands` is the share of runs that reached the beat at all;
  // a beat that lands on some runs and not others is a reading about the roster
  // rather than a defective window.
  const allRuns = SEATS.flatMap((seat) => bySeat.get(seat.id)!);
  console.log('\n  ── Beat windows (observed across the whole batch) ──');
  console.log(col('  beat', 7) + col('window', 18) + col('median', 10) + col('lands', 9) + 'label');
  const recorded: string[] = [];
  for (const beat of SURVIVOR_BEATS) {
    const landed = allRuns.map(beat.at).filter((v): v is number => v !== null);
    if (landed.length === 0) {
      console.log(col(`  ${beat.n}`, 7) + col('never lands', 18) + col('—', 10) + col('0%', 9));
      continue;
    }
    const s = spreadOf(landed, { at: (v) => v }).at!;
    console.log(
      col(`  ${beat.n}`, 7) +
        col(`${clock(s.min)}–${clock(s.max)}`, 18) +
        col(clock(s.median), 10) +
        col(pct(landed.length / allRuns.length), 9) +
        beat.label.split('—')[0]!.trim(),
    );
    // Paste-ready, because a window transcribed by hand is a window that drifts
    // from the run it claims to come from.
    recorded.push(
      `    { n: ${beat.n}, label: '…', recordedFireTimeRange: [${Math.round(s.min)}, ${Math.round(s.max)}] },`,
    );
  }
  console.log('\n  For `../manifest.ts` (labels from `./beats.ts`):');
  for (const line of recorded) console.log(line);

  // ── The draft, which is the spine's other stochastic leg ──
  //
  // DPS(t) is a distribution rather than a curve because offers are a weighted
  // pick over a narrowing pool. The reading that says whether that variance is
  // load-bearing is how often the roster's top device CHANGES across seeds: one
  // rotation on every seed means the draft's variance is decoration.
  console.log('\n  ── Draft variance ──');
  console.log(col('  seat', 13) + col('devices', 16) + col('evolved', 16) + 'top device');
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const s = spreadOf(runs, {
      devices: (r) => r.devices,
      evolved: (r) => r.evolved,
    });
    const top = categorySpreadOf(runs, (r) => {
      let best = '—';
      let bestKills = -1;
      for (const inst of r.installed) {
        const kills = r.deviceStats[inst.defId]?.kills ?? 0;
        if (kills > bestKills) {
          bestKills = kills;
          best = inst.defId;
        }
      }
      return best;
    });
    console.log(
      col(`  ${seat.id}`, 13) +
        col(formatSpread(s.devices!, num(0)), 16) +
        col(formatSpread(s.evolved!, num(1)), 16) +
        formatCategorySpread(top),
    );
  }

  // ── The target, checked ──
  //
  // Stated rather than computed into a pass/fail, because "mostly" is a design
  // word and the roster is four seats: a threshold here would invent a
  // precision the batch does not have.
  const causeByseat = SEATS.map((seat) => ({
    seat,
    causes: categorySpreadOf(bySeat.get(seat.id)!, (r) => r.bindingCause),
  }));
  const distinctModal = new Set(causeByseat.map((c) => c.causes.modal));
  console.log('\n  ── Against the declared target ──');
  console.log(
    `  Distinct modal causes across the roster: ${distinctModal.size} of ${SEATS.length}`,
  );
  console.log(`  ${[...distinctModal].join(', ')}`);
  for (const { seat, causes } of causeByseat) {
    const timerShare = (causes.counts['timer'] ?? 0) / causes.total;
    console.log(
      `  ${col(seat.id, 13)}modal ${col(causes.modal, 24)}${pct(causes.modalShare)} of seeds` +
        `, reaches timer ${pct(timerShare)}`,
    );
  }
}

main();

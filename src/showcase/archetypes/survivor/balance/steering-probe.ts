/**
 * Survivor: steering probe. Whether the star's movement policy is deciding with all its terms
 * or with one, and whether its path is one a hand could have drawn. Plays one take per star
 * × rating × seed with the star improvising, and every tenth tick reads the candidate
 * scores. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/steering-probe.ts [seeds]`
 * (default 4; G and PG).
 *
 * How to read it:
 * - A term's spread is its max minus its min across the sixteen candidates. An arg-max is
 *   decided by spread, never by level, so a term whose spread is near zero is not steering.
 *   `route` and `near` print weighted by the star's `eta`, in score units like the rest.
 * - `contact all` is the share of samples where every candidate expects contact: the cost
 *   then subtracts nearly evenly and steers little.
 * - `turn °/s` and `reversals/s` read the path. A jitterbug turns hundreds of degrees a
 *   second and reverses several times a second.
 */

import { RATINGS, STARS, type StarDef } from '../data';
import { REEL_ROUTE_WEIGHT, scoreHeadings, type HeadingScore } from '../modules/sim/steering';
import { createSteerer } from '../modules/sim/steering';
import { buildSet, openAll } from './_set';
import { claimChunk, emitResult, runPool } from './_pool';

interface Job {
  star: StarDef['id'];
  rating: number;
  seed: number;
}

const BANDS = [0, 50, 150, 300, Infinity];
const TERMS = ['threat', 'engage', 'connect', 'route', 'near', 'wall', 'turn'] as const;
type Term = (typeof TERMS)[number];

interface Reading {
  star: StarDef['id'];
  rating: number;
  seconds: number;
  /** Per band: samples, summed spread per term, samples with contact on every candidate. */
  bands: { n: number; spread: Record<Term, number>; contactAll: number }[];
  turnDegrees: number;
  reversals: number;
}

function read(job: Job): Reading {
  const set = buildSet(job.seed);
  openAll(set);
  const { take, engine } = set;
  const instinct = STARS.find((s) => s.id === job.star)!.instinct;
  take.startTake({ ...job, driver: 'instinct' });
  const a = take.arena()!;
  const steerer = createSteerer();
  const bands = BANDS.slice(1).map(() => ({
    n: 0,
    spread: Object.fromEntries(TERMS.map((t) => [t, 0])) as Record<Term, number>,
    contactAll: 0,
  }));
  let tick = 0;
  let turn = 0;
  let reversals = 0;
  let last = a.player.facing;
  const recent: number[] = [];
  while (take.view.screen === 'take') {
    if (tick % 10 === 0) {
      const scores = scoreHeadings(a, take.mods(), instinct, steerer.nav, steerer.fields(a));
      const b = bands[BANDS.findIndex((_, i) => a.extras.length < BANDS[i + 1]!)]!;
      b.n++;
      for (const t of TERMS) {
        const v = (h: HeadingScore) =>
          t === 'route'
            ? h.route * REEL_ROUTE_WEIGHT * instinct.eta
            : t === 'near'
              ? h.near * instinct.eta
              : h[t];
        const vs = scores.map(v);
        b.spread[t] += Math.max(...vs) - Math.min(...vs);
      }
      if (scores.every((h) => h.contact)) b.contactAll++;
    }
    engine.tickDriver.tickOnce();
    tick++;
    let d = a.player.facing - last;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turn += Math.abs(d);
    last = a.player.facing;
    recent.push(d);
    if (recent.length > 15) recent.shift();
    if (Math.abs(recent.reduce((x, y) => x + y, 0)) > (150 * Math.PI) / 180) {
      reversals++;
      recent.length = 0;
    }
  }
  const seconds = take.view.wrap!.seconds;
  set.dispose();
  return {
    star: job.star,
    rating: job.rating,
    seconds,
    bands,
    turnDegrees: (turn * 180) / Math.PI,
    reversals,
  };
}

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) emitResult(read(job));
} else {
  const seeds = Number(process.argv[2] ?? 4);
  const jobs = STARS.flatMap((s) =>
    [0, 1].flatMap((rating) =>
      Array.from({ length: seeds }, (_, i) => ({ star: s.id, rating, seed: i + 1 })),
    ),
  );
  const t0 = performance.now();
  const rs = await runPool<Job, Reading>(import.meta.url, jobs);
  console.log(
    `\nSURVIVOR steering probe: ${seeds} seeds a star at G and PG, the star improvising\n`,
  );
  console.log('mean term spread by bodies on the floor');
  console.log(`  band      samples  ${TERMS.map((t) => t.padStart(8)).join('')}  contact all`);
  for (let i = 0; i < BANDS.length - 1; i++) {
    const n = rs.reduce((x, r) => x + r.bands[i]!.n, 0);
    if (n === 0) continue;
    const cells = TERMS.map((t) =>
      (rs.reduce((x, r) => x + r.bands[i]!.spread[t], 0) / n).toFixed(1).padStart(8),
    );
    const all = rs.reduce((x, r) => x + r.bands[i]!.contactAll, 0);
    console.log(
      `  ${`${BANDS[i]}–${BANDS[i + 1] === Infinity ? '' : BANDS[i + 1]}`.padEnd(9)} ${String(n).padEnd(8)} ${cells.join('')}  ${((100 * all) / n).toFixed(0)}%`,
    );
  }
  console.log('\nthe path');
  for (const star of STARS)
    for (const rating of [0, 1]) {
      const r = rs.filter((x) => x.star === star.id && x.rating === rating);
      const secs = r.reduce((x, y) => x + y.seconds, 0);
      console.log(
        `  ${star.id.padEnd(9)} ${RATINGS[rating]!.label.padEnd(3)} turn ${(r.reduce((x, y) => x + y.turnDegrees, 0) / secs).toFixed(0).padStart(4)} °/s  ` +
          `reversals ${(r.reduce((x, y) => x + y.reversals, 0) / secs).toFixed(2)}/s`,
      );
    }
  console.log(`\n${jobs.length} takes in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

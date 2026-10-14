/**
 * Survivor: take probe. One take per star × rating × seed, each on a fresh set with no
 * agency, every star signed and every rating open, the star improvising. Reads what a take
 * does at each rating with nothing bought: how it ends, the rewrites against the ladder, η
 * and contact. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/take-probe.ts [seeds] [ratings]`
 * (default 8 seeds, ratings `0123`). Jobs fan over the cores (`_pool.ts`).
 *
 * How to read it:
 * - `cut` is takes that reached CUT of those run. G should reach it with nothing bought; the
 *   harsher ratings are what the agency is for, so a zero there is a wall, not a target.
 * - `η` is reels banked over reels dropped. The spine assumes `ANCHORS.eta`.
 * - `contact` is seconds touched; `away` is arrivals the `MAX_EXTRAS` guard turned away,
 *   which should be zero wherever the take is decided.
 * - The ladder rows compare each rewrite's median time on G with the spine's prediction.
 *   Early beats run late while η is low before the first sweep.
 */

import { ANCHORS, BEATS, RATINGS, STARS, predictedBeatTime, type StarDef } from '../data';
import { buildSet, clock, median, openAll, playTake, type TakeResult } from './_set';
import { claimChunk, emitResult, runPool } from './_pool';

interface Job {
  star: StarDef['id'];
  rating: number;
  seed: number;
}

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) {
    const set = buildSet(job.seed);
    openAll(set);
    emitResult(playTake(set, job));
    set.dispose();
  }
} else {
  const seeds = Number(process.argv[2] ?? 8);
  const ratings = (process.argv[3] ?? '0123').split('').map(Number);
  const jobs: Job[] = [];
  for (const star of STARS)
    for (const rating of ratings)
      for (let seed = 1; seed <= seeds; seed++) jobs.push({ star: star.id, rating, seed });
  const t0 = performance.now();
  const results = await runPool<Job, TakeResult>(import.meta.url, jobs);

  console.log(`\nSURVIVOR take probe: ${seeds} seeds a cell, no agency, the star improvising\n`);
  console.log(
    'star       rating  cut   median end  level  η     contact  in-shot  peak  away  kills/s',
  );
  for (const star of STARS) {
    for (const rating of ratings) {
      const rs = results.filter((r) => r.star === star.id && r.rating === rating);
      const cut = rs.filter((r) => r.end === 'cut').length;
      const eta =
        rs.reduce((a, r) => a + r.reelsBanked, 0) / rs.reduce((a, r) => a + r.reelsDropped, 0);
      const shot =
        rs.reduce((a, r) => a + r.inShotKills, 0) /
        Math.max(
          1,
          rs.reduce((a, r) => a + r.kills, 0),
        );
      console.log(
        [
          star.id.padEnd(10),
          RATINGS[rating]!.label.padEnd(7),
          `${cut}/${rs.length}`.padEnd(5),
          clock(median(rs.map((r) => r.seconds))).padEnd(11),
          String(median(rs.map((r) => r.level))).padEnd(6),
          eta.toFixed(2).padEnd(5),
          `${median(rs.map((r) => r.contactSeconds)).toFixed(0)}s`.padEnd(8),
          `${(shot * 100).toFixed(0)}%`.padEnd(8),
          String(Math.max(...rs.map((r) => r.peakExtras))).padEnd(5),
          String(rs.reduce((a, r) => a + r.turnedAway, 0)).padEnd(5),
          median(rs.map((r) => r.kills / r.seconds)).toFixed(2),
        ].join(' '),
      );
    }
  }

  if (ratings.includes(0)) {
    console.log('\nThe ladder on G: median rewrite time against the spine (s)');
    for (const star of STARS) {
      const rs = results.filter((r) => r.star === star.id && r.rating === 0);
      const row = BEATS.times.map((_, i) => {
        const ts = rs.map((r) => r.rewrites[i]).filter((t): t is number => t !== undefined);
        return ts.length ? median(ts).toFixed(0) : '–';
      });
      console.log(`  ${star.id.padEnd(9)} ${row.map((v) => v.padStart(4)).join('')}`);
    }
    const pred = BEATS.times.map((_, i) => predictedBeatTime(i + 1).toFixed(0));
    console.log(`  ${'ladder'.padEnd(9)} ${pred.map((v) => v.padStart(4)).join('')}`);
    console.log(
      `  ${'schedule'.padEnd(9)} ${BEATS.times.map((t) => t.toFixed(0).padStart(4)).join('')}`,
    );
  }
  console.log(
    `\n${jobs.length} takes of up to ${clock(ANCHORS.takeSeconds)} in ${((performance.now() - t0) / 1000).toFixed(1)} s`,
  );
}

/**
 * Survivor: take probe. One take per star × rating × seed, each on a fresh set with every
 * star signed and every rating open, the star improvising. At each rating the set holds the
 * agency the spine's model career holds when that rating opens (`CAREER`), so a rating is
 * played as the career first meets it. Reads how a take ends, the rewrites against the
 * ladder, η and contact. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/take-probe.ts [seeds] [ratings] [bare]`
 * (default 8 seeds, ratings `0123`; `bare` plays every rating with nothing bought). Jobs fan
 * over the cores (`_pool.ts`).
 *
 * How to read it:
 * - `cut` is takes whose lead fell, of those run; `fall` is the median seconds from the
 *   climax to the fall. `lead` is takes that reached the climax and `left` the median share
 *   of the lead's hp left when the others ended. A cell played with its opening agency is
 *   meant to be a gate: the lead falls in some takes, not all.
 * - `marks` is the mean marks filled a take; `jackpots` is rivals downed over rivals cast.
 * - `η` is reels banked over reels dropped. `income` is reels banked over what the spine's
 *   income model predicts for the same seconds at the same depth: it carries η, the share
 *   of arrivals downed and the shot together, which is what the ladder rides. 1.00 is on
 *   the spine; `ANCHORS.incomeShare` is the term to refit.
 * - `contact` is seconds touched; `away` is arrivals the `MAX_EXTRAS` guard turned away,
 *   which should be zero wherever the take is decided.
 * - The ladder rows compare each rewrite's median time on G with the spine's prediction.
 *   Early beats run late while η is low before the first sweep.
 */

import {
  ANCHORS,
  BEATS,
  CAREER,
  RATINGS,
  RATING_DEPTH,
  STARS,
  cumulativeIncome,
  predictedBeatTime,
  type StarDef,
} from '../data';
import { formatClock } from '@/composables/useFormatting';
import { seedBatch, spreadOf } from '@/balance';
import { buildSet, equip, openAll, playTake, type TakeResult } from './_set';
import { claimChunk, emitResult, runPool } from './_pool';

interface Job {
  star: StarDef['id'];
  rating: number;
  seed: number;
  bare: boolean;
}

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) {
    const set = buildSet(job.seed);
    openAll(set);
    if (!job.bare) equip(set, CAREER[job.rating]!.agency);
    emitResult(playTake(set, job));
    set.dispose();
  }
} else {
  const seeds = Number(process.argv[2] ?? 8);
  const ratings = (process.argv[3] ?? '0123').split('').map(Number);
  const bare = process.argv[4] === 'bare';
  const jobs: Job[] = [];
  for (const star of STARS)
    for (const rating of ratings)
      for (const seed of seedBatch(seeds)) jobs.push({ star: star.id, rating, seed, bare });
  const t0 = performance.now();
  const results = await runPool<Job, TakeResult>(import.meta.url, jobs);

  console.log(
    `\nSURVIVOR take probe: ${seeds} seeds a cell, ${bare ? 'nothing bought' : 'the model career’s agency at each rating'}, the star improvising\n`,
  );
  console.log(
    'star       rating  cut   fall  lead  left  marks  jackpots  median end  level  η     income  contact  in-shot  peak  away',
  );
  for (const star of STARS) {
    for (const rating of ratings) {
      const rs = results.filter((r) => r.star === star.id && r.rating === rating);
      const cut = rs.filter((r) => r.end === 'cut').length;
      const eta =
        rs.reduce((a, r) => a + r.reelsBanked, 0) / rs.reduce((a, r) => a + r.reelsDropped, 0);
      const income =
        rs.reduce((a, r) => a + r.reelsBanked, 0) /
        rs.reduce((a, r) => a + cumulativeIncome(r.seconds, RATING_DEPTH[r.rating]), 0);
      const shot =
        rs.reduce((a, r) => a + r.inShotKills, 0) /
        Math.max(
          1,
          rs.reduce((a, r) => a + r.kills, 0),
        );
      // A take a column does not apply to reads NaN, which the spread drops.
      const over = spreadOf(rs, {
        fall: (r) => (r.end === 'cut' ? r.seconds - ANCHORS.takeSeconds : NaN),
        left: (r) => r.leadLeft ?? NaN,
        marks: (r) => r.marksFilled,
        end: (r) => r.seconds,
        level: (r) => r.level,
        contact: (r) => r.contactSeconds,
        peak: (r) => r.peakExtras,
      });
      console.log(
        [
          star.id.padEnd(10),
          RATINGS[rating]!.label.padEnd(7),
          `${cut}/${rs.length}`.padEnd(5),
          (over.fall ? `${over.fall.median.toFixed(0)}s` : '–').padEnd(5),
          String(rs.filter((r) => r.leadLeft !== null).length).padEnd(5),
          (over.left ? `${(over.left.median * 100).toFixed(0)}%` : '–').padEnd(5),
          over.marks!.avg.toFixed(1).padEnd(6),
          `${rs.reduce((a, r) => a + r.jackpots, 0)}/${rs.reduce((a, r) => a + r.rivals, 0)}`.padEnd(
            9,
          ),
          formatClock(over.end!.median).padEnd(11),
          String(over.level!.median).padEnd(6),
          eta.toFixed(2).padEnd(5),
          income.toFixed(2).padEnd(7),
          `${over.contact!.median.toFixed(0)}s`.padEnd(8),
          `${(shot * 100).toFixed(0)}%`.padEnd(8),
          String(over.peak!.max).padEnd(5),
          String(rs.reduce((a, r) => a + r.turnedAway, 0)),
        ].join(' '),
      );
    }
  }

  if (ratings.includes(0)) {
    console.log('\nThe ladder on G: median rewrite time against the spine (s)');
    for (const star of STARS) {
      const rs = results.filter((r) => r.star === star.id && r.rating === 0);
      const fired = spreadOf(
        rs,
        Object.fromEntries(BEATS.times.map((_, i) => [i, (r: TakeResult) => r.rewrites[i] ?? NaN])),
      );
      const row = BEATS.times.map((_, i) => fired[i]?.median.toFixed(0) ?? '–');
      console.log(`  ${star.id.padEnd(9)} ${row.map((v) => v.padStart(4)).join('')}`);
    }
    const pred = BEATS.times.map((_, i) => predictedBeatTime(i + 1).toFixed(0));
    console.log(`  ${'ladder'.padEnd(9)} ${pred.map((v) => v.padStart(4)).join('')}`);
    console.log(
      `  ${'schedule'.padEnd(9)} ${BEATS.times.map((t) => t.toFixed(0).padStart(4)).join('')}`,
    );
  }
  console.log(
    `\n${jobs.length} takes of up to ${formatClock(ANCHORS.takeSeconds)} in ${((performance.now() - t0) / 1000).toFixed(1)} s`,
  );
}

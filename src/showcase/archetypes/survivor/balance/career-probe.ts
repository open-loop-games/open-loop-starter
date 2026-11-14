/**
 * Survivor: career probe. The meta arc: takes back to back from a fresh save, each at the
 * harshest open rating with the signed stars in turn, the star improvising, and the
 * reference agent shopping between takes (`_set.ts` `shop`). Reads when the arc's firsts land
 * in session time and where the agency stands at the end. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/career-probe.ts [seeds] [takes]`
 * (default 8 seeds of 18 takes, about two and a half hours of session, run in about 30 s).
 * One career a child process (`_pool.ts`); `CAREER_LOG=1` prints the first seed's takes one by one.
 *
 * How to read it:
 * - The firsts are session time, the sum of the takes before them. `IDENTITY.md` § The
 *   arc records seed 1's career, which `beats.ts` plays. `the picture wraps` is R's lead falling, the arc's end,
 *   which the spine's `arcTakes` aims near two hours; `the agency bought out` should land
 *   close to it.
 * - `takes` per rating is how many takes the career spent at each; a career stuck at one
 *   rating with the agency growing slowly is the ratings wall.
 * - `agency` is the levels bought of each perk at the end.
 */

import { AGENCY, RATINGS, STARS } from '../data';
import { formatClock } from '@/composables/useFormatting';
import { seedBatch, spreadOf } from '@/balance';
import { playCareer, type Career, type Job } from './_career';
import { claimChunk, emitResult, runPool } from './_pool';

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) emitResult(playCareer(job));
} else {
  const seeds = Number(process.argv[2] ?? 8);
  const takes = Number(process.argv[3] ?? 18);
  const t0 = performance.now();
  const careers = await runPool<Job, Career>(
    import.meta.url,
    seedBatch(seeds).map((seed) => ({ seed, takes })),
  );

  console.log(`\nSURVIVOR career probe: ${seeds} seeds of ${takes} takes, the stars improvising\n`);
  if (process.env.CAREER_LOG) {
    for (const t of careers[0]!.takes) {
      console.log(
        `  ${formatClock(t.at).padStart(7)}  ${t.star.padEnd(9)} ${RATINGS[t.rating]!.label.padEnd(6)}` +
          `${t.end.padEnd(8)} ${formatClock(t.seconds)}  lvl ${String(t.level).padEnd(3)}` +
          `+${t.clout} clout  ${t.bought.join(', ')}`,
      );
    }
    console.log('');
  }

  const keys = [...new Set(careers.flatMap((c) => Object.keys(c.firsts)))];
  // Over the careers that reached each first; one that did not reads NaN, which the spread drops.
  const firsts = spreadOf(
    careers,
    Object.fromEntries(keys.map((k) => [k, (c: Career) => c.firsts[k] ?? NaN])),
  );
  keys.sort((a, b) => firsts[a]!.median - firsts[b]!.median);
  console.log(
    `${'first'.padEnd(24)} ${`seed ${careers[0]!.seed}`.padEnd(11)} ${'median'.padEnd(9)} reached`,
  );
  for (const k of keys) {
    const s1 = careers[0]!.firsts[k];
    console.log(
      `${k.padEnd(24)} ${(s1 === undefined ? '–' : formatClock(s1)).padEnd(11)} ${formatClock(firsts[k]!.median).padEnd(9)} ${firsts[k]!.count}/${careers.length}`,
    );
  }

  console.log('\ntakes at each rating (median over seeds), and how they ended');
  for (const rating of RATINGS) {
    const at = careers.map((c) => c.takes.filter((t) => t.rating === rating.index));
    const all = at.flat();
    if (all.length === 0) continue;
    const cut = all.filter((t) => t.end === 'cut').length;
    const takesAt = spreadOf(at, { n: (a) => a.length }).n!;
    const end = spreadOf(all, { s: (t) => t.seconds }).s!;
    console.log(
      `  ${rating.label.padEnd(6)} ${String(takesAt.median).padEnd(4)} takes  ` +
        `CUT ${cut}/${all.length}  median end ${formatClock(end.median)}  ` +
        `away ${all.reduce((a, t) => a + t.turnedAway, 0)}`,
    );
  }
  for (const star of STARS) {
    const all = careers.flatMap((c) => c.takes.filter((t) => t.star === star.id));
    if (all.length === 0) continue;
    const end = spreadOf(all, { s: (t) => t.seconds }).s!;
    console.log(
      `  ${star.id.padEnd(9)} ${all.length} takes, CUT ${all.filter((t) => t.end === 'cut').length}, median end ${formatClock(end.median)}`,
    );
  }

  const end = spreadOf(careers, {
    session: (c) => c.seconds,
    ...Object.fromEntries(AGENCY.map((a) => [a.id, (c: Career) => c.agency[a.id] ?? 0])),
  });
  console.log(`\nagency at the end (median levels), and session time`);
  console.log('  ' + AGENCY.map((a) => `${a.id} ${end[a.id]!.median}/${a.maxLevel}`).join(' · '));
  console.log(`  session ${formatClock(end.session!.median)} median over ${takes} takes`);
  console.log(`\n${seeds} careers in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

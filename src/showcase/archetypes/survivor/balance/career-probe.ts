/**
 * Survivor: career probe. The meta arc: takes back to back from a fresh save, each at the
 * harshest open rating with the signed stars in turn, the star improvising, and the
 * reference agent shopping between takes (`_set.ts` `shop`). Reads when the arc's firsts land
 * in session time and where the agency stands at the end. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/career-probe.ts [seeds] [takes]`
 * (default 8 seeds of 12 takes). One career a child process (`_pool.ts`); `CAREER_LOG=1`
 * prints seed 1's takes one by one.
 *
 * How to read it:
 * - The firsts are session time, the sum of the takes before them. `manifest.ts` records
 *   seed 1's.
 * - `takes` per rating is how many takes the career spent at each; a career stuck at one
 *   rating with the agency growing slowly is the ratings wall.
 * - `agency` is the levels bought of each perk at the end.
 */

import { AGENCY, RATINGS, STARS } from '../data';
import { buildSet, callSheet, clock, median, playTake, shop, type TakeResult } from './_set';
import { claimChunk, emitResult, runPool } from './_pool';

interface Job {
  seed: number;
  takes: number;
}

interface Career {
  seed: number;
  takes: (TakeResult & { at: number; bought: string[] })[];
  firsts: Record<string, number>;
  agency: Record<string, number>;
  seconds: number;
}

function play(job: Job): Career {
  const set = buildSet(job.seed);
  let clockS = 0;
  const firsts: Record<string, number> = {};
  const mark = (k: string, t: number) => (firsts[k] ??= t);
  const takes: Career['takes'] = [];
  for (let n = 0; n < job.takes; n++) {
    const sheet = callSheet(set);
    const star = sheet.stars[n % sheet.stars.length]!;
    const r = playTake(set, { star, rating: sheet.rating, seed: job.seed * 1000 + n });
    if (n === 0 && r.rewrites[0] !== undefined) mark('the first rewrite', r.rewrites[0]);
    const at = clockS;
    clockS += r.seconds;
    if (r.end === 'cut') mark(`CUT at ${RATINGS[r.rating]!.label}`, clockS);
    const bought = shop(set);
    for (const b of bought) if (b.startsWith('signed')) mark(b, clockS);
    for (const rating of RATINGS.slice(1))
      if (set.meta.ratings.getPurchasable(rating.id)?.active.value)
        mark(`${rating.label} opens`, clockS);
    takes.push({ ...r, at, bought });
  }
  const agency = Object.fromEntries(
    set.meta.agency.getAll().map((e) => [e.def.id, Number(e.purchasable.count.value)]),
  );
  set.dispose();
  return { seed: job.seed, takes, firsts, agency, seconds: clockS };
}

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) emitResult(play(job));
} else {
  const seeds = Number(process.argv[2] ?? 8);
  const takes = Number(process.argv[3] ?? 12);
  const t0 = performance.now();
  const careers = await runPool<Job, Career>(
    import.meta.url,
    Array.from({ length: seeds }, (_, i) => ({ seed: i + 1, takes })),
  );

  console.log(`\nSURVIVOR career probe: ${seeds} seeds of ${takes} takes, the stars improvising\n`);
  if (process.env.CAREER_LOG) {
    for (const t of careers[0]!.takes) {
      console.log(
        `  ${clock(t.at).padStart(6)}  ${t.star.padEnd(9)} ${RATINGS[t.rating]!.label.padEnd(6)}` +
          `${t.end.padEnd(8)} ${clock(t.seconds)}  lvl ${String(t.level).padEnd(3)}` +
          `+${t.clout} clout  ${t.bought.join(', ')}`,
      );
    }
    console.log('');
  }

  const keys = [...new Set(careers.flatMap((c) => Object.keys(c.firsts)))];
  const order = (k: string) => median(careers.map((c) => c.firsts[k] ?? Infinity));
  keys.sort((a, b) => order(a) - order(b));
  console.log('first                    seed 1    median    reached');
  for (const k of keys) {
    const ts = careers.map((c) => c.firsts[k]).filter((t): t is number => t !== undefined);
    const s1 = careers[0]!.firsts[k];
    console.log(
      `${k.padEnd(24)} ${(s1 === undefined ? '–' : clock(s1)).padEnd(9)} ${clock(median(ts)).padEnd(9)} ${ts.length}/${careers.length}`,
    );
  }

  console.log('\ntakes at each rating (median over seeds), and how they ended');
  for (const rating of RATINGS) {
    const at = careers.map((c) => c.takes.filter((t) => t.rating === rating.index));
    const all = at.flat();
    if (all.length === 0) continue;
    const cut = all.filter((t) => t.end === 'cut').length;
    console.log(
      `  ${rating.label.padEnd(6)} ${String(median(at.map((a) => a.length))).padEnd(4)} takes  ` +
        `CUT ${cut}/${all.length}  median end ${clock(median(all.map((t) => t.seconds)))}  ` +
        `away ${all.reduce((a, t) => a + t.turnedAway, 0)}`,
    );
  }
  for (const star of STARS) {
    const all = careers.flatMap((c) => c.takes.filter((t) => t.star === star.id));
    if (all.length === 0) continue;
    console.log(
      `  ${star.id.padEnd(9)} ${all.length} takes, CUT ${all.filter((t) => t.end === 'cut').length}, median end ${clock(median(all.map((t) => t.seconds)))}`,
    );
  }

  console.log(`\nagency at the end (median levels), and session time`);
  console.log(
    '  ' +
      AGENCY.map(
        (a) => `${a.id} ${median(careers.map((c) => c.agency[a.id] ?? 0))}/${a.maxLevel}`,
      ).join(' · '),
  );
  console.log(
    `  session ${clock(median(careers.map((c) => c.seconds)))} median over ${takes} takes`,
  );
  console.log(`\n${seeds} careers in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

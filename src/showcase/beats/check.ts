/**
 * Beat check: plays every story's beat recording and compares it with the windows its
 * `manifest.ts` records. Prints; exits non-zero when a window has drifted or a beat has no
 * recording.
 *
 * Run: `pnpm beats [story...] [--write]`
 *
 * - A story's recording is its `balance/beats.ts`: `runs`, the runs one recording spans
 *   (seeds, tick sizes or one deterministic run), and `record(run)`, which plays one run
 *   under the reference player and returns each beat's fire time by beat number. A beat the
 *   run measures but never reached is `null`; a beat it does not measure is left out, so
 *   two kinds of run (one seed's opening, another's career) can share a recording.
 * - A window is the min and max over the runs that measure the beat, rounded to the half
 *   second. A beat no run measures, or one any run never reached, fails the check.
 * - `--write` rewrites the drifted windows in each `manifest.ts`. The docs that quote a beat
 *   (`IDENTITY.md`'s arc table) are not rewritten; the printout names what moved.
 *
 * Each run plays in its own process, so engines never share one, and runs play in parallel.
 */
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';
import type { ArchetypeManifest } from '@/types';

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const ARCHETYPES = join(import.meta.dirname, '../archetypes');
const SELF = relative(ROOT, import.meta.filename);
const RESULT = 'BEATS-RESULT ';

type Times = Record<number, number | null>;

interface Recording {
  runs: unknown[];
  record(run: unknown): Times | Promise<Times>;
}

const recordingOf = (story: string) => join(ARCHETYPES, story, 'balance/beats.ts');
const manifestOf = (story: string) => join(ARCHETYPES, story, 'manifest.ts');
const half = (s: number) => Math.round(s * 2) / 2;

// ─── Child: play one run, print its times ───

const childAt = process.argv.indexOf('--child');
if (childAt >= 0) {
  const [story, index] = [process.argv[childAt + 1]!, Number(process.argv[childAt + 2])];
  const rec = (await import(recordingOf(story))) as Recording;
  const times = await rec.record(rec.runs[index]);
  console.log(RESULT + JSON.stringify(times));
  process.exit(0);
}

// ─── Parent: fan the runs out, then compare ───

const args = process.argv.slice(2);
const write = args.includes('--write');
const named = args.filter((a) => !a.startsWith('--'));
const stories = readdirSync(ARCHETYPES).filter(
  (s) => !s.startsWith('_') && existsSync(recordingOf(s)) && (!named.length || named.includes(s)),
);
const missing = named.filter((s) => !stories.includes(s));
if (missing.length) {
  console.error(`no balance/beats.ts for: ${missing.join(', ')}`);
  process.exit(2);
}

const jobs: { story: string; index: number }[] = [];
for (const story of stories) {
  const rec = (await import(recordingOf(story))) as Recording;
  rec.runs.forEach((_, index) => jobs.push({ story, index }));
}

const results = new Map<string, Times[]>();
const failures: string[] = [];
let next = 0;
async function worker(): Promise<void> {
  while (next < jobs.length) {
    const { story, index } = jobs[next++]!;
    try {
      const { stdout } = await run(
        'pnpm',
        ['exec', 'vite-node', SELF, '--child', story, String(index)],
        {
          cwd: ROOT,
          maxBuffer: 64 * 1024 * 1024,
        },
      );
      const line = stdout.split('\n').find((l) => l.startsWith(RESULT));
      if (!line) throw new Error('no result line');
      const list = results.get(story) ?? [];
      list[index] = JSON.parse(line.slice(RESULT.length));
      results.set(story, list);
    } catch (e) {
      failures.push(`${story} run ${index}: ${(e as Error).message.split('\n')[0]}`);
    }
  }
}
const started = Date.now();
await Promise.all(Array.from({ length: Math.min(availableParallelism(), jobs.length) }, worker));

let drifted = 0;
let unreached = 0;
for (const story of stories) {
  const runs = results.get(story);
  if (!runs || runs.length !== jobs.filter((j) => j.story === story).length) continue;
  const { manifest } = (await import(manifestOf(story))) as { manifest: ArchetypeManifest };
  const windows = new Map<number, [number, number]>();
  console.log(`\n${story} — ${runs.length} run${runs.length > 1 ? 's' : ''}`);
  for (const beat of manifest.beats) {
    const times = runs.filter((r) => beat.n in r).map((r) => r[beat.n]);
    const recorded = beat.recordedFireTimeRange;
    const was = recorded ? `[${recorded[0]}, ${recorded[1]}]` : 'none';
    if (!times.length || times.some((t) => t === null)) {
      unreached++;
      const why = times.length ? 'not reached in every run' : 'measured by no run';
      console.log(`  ✗ ${beat.n} ${beat.label}: recorded ${was}, ${why}`);
      continue;
    }
    const reached = times as number[];
    const now: [number, number] = [half(Math.min(...reached)), half(Math.max(...reached))];
    const same = recorded && recorded[0] === now[0] && recorded[1] === now[1];
    if (!same) {
      drifted++;
      windows.set(beat.n, now);
    }
    console.log(
      `  ${same ? '·' : '✗'} ${beat.n} ${beat.label}: recorded ${was}, measured [${now[0]}, ${now[1]}]`,
    );
  }
  if (write && windows.size) {
    writeFileSync(manifestOf(story), rewrite(readFileSync(manifestOf(story), 'utf8'), windows));
    await run('pnpm', ['exec', 'oxfmt', manifestOf(story)], { cwd: ROOT });
    console.log(`  wrote ${windows.size} window${windows.size > 1 ? 's' : ''} to manifest.ts`);
  }
}

for (const f of failures) console.log(`\n✗ ${f}`);
console.log(
  `\n${jobs.length} runs in ${((Date.now() - started) / 1000).toFixed(0)}s · ` +
    `${drifted} window${drifted === 1 ? '' : 's'} ${write ? 'rewritten' : 'drifted'} · ${unreached} unreached`,
);
process.exit(failures.length || unreached || (drifted && !write) ? 1 : 0);

/** Replaces each listed beat's `recordedFireTimeRange`, adding one where the beat has none. */
function rewrite(src: string, windows: Map<number, [number, number]>): string {
  let out = src;
  for (const [n, [lo, hi]] of windows) {
    const start = out.search(new RegExp(`\\bn: ${n},`));
    if (start < 0) throw new Error(`manifest has no beat n: ${n}`);
    const end = out.indexOf('}', start);
    const body = out.slice(start, end);
    const range = `recordedFireTimeRange: [${lo}, ${hi}]`;
    const next = /recordedFireTimeRange: \[[^\]]*\]/.test(body)
      ? body.replace(/recordedFireTimeRange: \[[^\]]*\]/, range)
      : `${body.trimEnd().replace(/,?$/, ',')} ${range} `;
    out = out.slice(0, start) + next + out.slice(end);
  }
  return out;
}

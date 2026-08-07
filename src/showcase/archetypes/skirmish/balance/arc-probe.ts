/**
 * Skirmish arc probe — when the beats fire, and what the match looks like
 * while they do.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/arc-probe.ts
 *
 * Drives the SHIPPING automation on a real engine and prints. It never asserts:
 * a beat outside its window is a reading about the window or the content, not a
 * failure (`open-loop-engine/docs/consumer-guide-balance.md` § Why this isn't a
 * test suite).
 *
 * Reads the default matchup — rush against investor — from both
 * seats, because a beat is a per-faction experience and the two seats are
 * having different ones by construction.
 */

import { buildSkirmishSimEngine, INVESTOR, RUSH } from './_engine';
import { createArcTrace, observe, skirmishBeats, armySeparation, type BeatDef } from './beats';
import { EconomyKey, MatchKey, TacticalKey, type Side } from '../modules';

const STEP_SEC = 0.25; // coarse enough to be cheap, fine enough for a 15s window
const MAX_SEC = 900;
const SIDES: Side[] = ['a', 'b'];

interface Firing {
  beat: BeatDef;
  side: Side;
  at: number | null;
}

function fmtTime(sec: number | null): string {
  if (sec === null) return 'never';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(2)}m`;
}

function verdict(f: Firing): string {
  if (f.at === null) return 'NEVER';
  const [from, to] = f.beat.window;
  if (f.at < from) return 'early';
  if (f.at > to) return 'LATE';
  return 'in window';
}

console.log(
  `# Skirmish arc probe — rush (φ=${RUSH.economyShare}) vs investor (φ=${INVESTOR.economyShare})\n`,
);
console.log('Driving the shipping automation. Windows from `beats.ts`; a miss is a');
console.log('reading, not a failure.\n');

const engine = buildSkirmishSimEngine({ maxDeltaTime: STEP_SEC * 4 });
const trace = createArcTrace();
const beats = skirmishBeats(trace);
const economy = engine.tryInject(EconomyKey)!;
const tactical = engine.tryInject(TacticalKey)!;
const match = engine.tryInject(MatchKey)!;

const firings: Firing[] = [];
for (const beat of beats) {
  for (const side of SIDES) firings.push({ beat, side, at: null });
}

interface Sample {
  t: number;
  workers: Record<Side, number>;
  units: Record<Side, number>;
  sep: number;
}
const samples: Sample[] = [];
const SAMPLE_EVERY = 15;
let nextSample = 0;

let elapsed = 0;
let resolvedAt: number | null = null;
while (elapsed < MAX_SEC) {
  engine.tickDriver.simulateTick(STEP_SEC);
  elapsed += STEP_SEC;

  observe(engine, trace);

  for (const f of firings) {
    if (f.at !== null) continue;
    if (f.beat.predicate({ engine, side: f.side })) f.at = elapsed;
  }

  if (elapsed >= nextSample) {
    samples.push({
      t: elapsed,
      workers: { a: economy.workers.a.value, b: economy.workers.b.value },
      units: { a: tactical.units.a.value.length, b: tactical.units.b.value.length },
      sep: armySeparation(engine),
    });
    nextSample += SAMPLE_EVERY;
  }

  if (resolvedAt === null && match.outcome.value !== null) {
    resolvedAt = elapsed;
    break;
  }
}

// ─── Beats ───────────────────────────────────────────────────────────────────

console.log('## Beat firings\n');
console.log('| beat | seat | window | fired | verdict |');
console.log('|---|---|---|---|---|');
for (const f of firings) {
  const [from, to] = f.beat.window;
  console.log(`| ${f.beat.id} | ${f.side} | ${from}–${to}s | ${fmtTime(f.at)} | ${verdict(f)} |`);
}

const mistimed = firings.filter((f) => verdict(f) === 'early' || verdict(f) === 'LATE');
const nevers = firings.filter((f) => f.at === null);

console.log(`\n${mistimed.length} of ${firings.length} readings fired outside their window.`);
if (mistimed.length > 0) {
  console.log('Each one is a question about the window or the content first —');
  console.log('see `../BALANCING.md` § Known thin before reaching for a constant.');
}

if (nevers.length > 0) {
  console.log(`\n${nevers.length} beat(s) never fired:`);
  for (const f of nevers) console.log(`  - ${f.beat.id} (seat ${f.side})`);
  console.log('\n**A never is not automatically a gap.** The break/recovery pair is');
  console.log('asymmetric by nature: a seat that wins cleanly never has its army broken,');
  console.log('and a seat that collapses never recovers. Read those two against');
  console.log('`base-broken` — if the winner never broke and the loser never recovered,');
  console.log('the beats are describing the match correctly. A never on any OTHER beat,');
  console.log('or on both seats at once, is the reading worth chasing.');
}

// ─── The match, sampled ──────────────────────────────────────────────────────

console.log('\n## The match, every 15s\n');
console.log('| t | workers a/b | units a/b | army separation |');
console.log('|---|---|---|---|');
for (const s of samples) {
  const sep = Number.isFinite(s.sep) ? s.sep.toFixed(1) : '—';
  console.log(
    `| ${fmtTime(s.t)} | ${s.workers.a}/${s.workers.b} | ${s.units.a}/${s.units.b} | ${sep} |`,
  );
}

// ─── Outcome ─────────────────────────────────────────────────────────────────

console.log('\n## Outcome\n');
if (resolvedAt === null) {
  console.log(`Unresolved after ${fmtTime(MAX_SEC)} — neither base fell.`);
  console.log('A match that will not resolve is a content reading: either the');
  console.log('armies cannot break a base, or the two seats have stalemated.');
} else {
  console.log(`Resolved at ${fmtTime(resolvedAt)}.`);
  console.log(`Final workers — a: ${economy.workers.a.value}, b: ${economy.workers.b.value}`);
  console.log(
    `Realized φ — a: ${economy.realizedShare('a').toFixed(3)}, ` +
      `b: ${economy.realizedShare('b').toFixed(3)}`,
  );
}

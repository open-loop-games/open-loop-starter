/**
 * Producer — pacing probe. Does the arc stay engaged, and does the content
 * cover the arc it is budgeted for?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/pacing-probe.ts`
 *
 * `producer-projection.ts` § 2 sizes `m` off beat time on the *isolated*
 * ladder — the rate held constant — and says in as many words that this does not
 * predict felt cadence. `arc-probe.ts` reports one run-average beat for the
 * whole eight hours. Neither answers what the engine guide names as the actual
 * objective (§ Flow channels): **shape of play** — how much of the arc is spent
 * in the engaged bands, and whether content is still arriving while it is.
 *
 * **The beat is measured, not averaged.** An earlier cut of this probe binned
 * purchases into fixed windows and divided, which quietly capped the
 * probe: at a window of W seconds the longest measurable beat is W, so a
 * 300s window could not report anything worse than the *first second* of
 * boredom — `boredom` is [300, 900) and `frustration` [900, 3600). It returned
 * "100% engaged" with frustration structurally unreachable. This version
 * samples every sim-second and reads the real gap between consecutive
 * purchases, so the measurable range is the whole table, and occupancy is
 * weighted by **time spent** rather than by window count — a single hour-long
 * stall outweighs a dozen brisk minutes, which is how it feels.
 *
 * Prints; asserts nothing.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import { REFINEMENTS, REVISIONS } from '../data';
import { runArc, hms } from './_engine';
import type { ArcReading } from './beats';

const ARC_SECONDS = 8 * 3600;
const ENGAGED = new Set(['arousal', 'flow', 'flow-upper']);

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);

async function main(): Promise<void> {
  const samples: ArcReading[] = [];
  const arc = await runArc({
    seconds: ARC_SECONDS,
    sampleEverySeconds: 1,
    onSample: (reading) => samples.push(reading),
    persistenceNamespacePrefix: 'producer-pacing',
  });

  // ── real inter-purchase gaps ────────────────────────────────────────────
  // A second in which the fleet grew by k counts as k purchases; the gap is
  // measured to the previous purchase second. The trailing gap — last purchase
  // to arc end — is included deliberately: a dry tail is exactly the shape this
  // probe exists to catch, and dropping it would flatter the result.
  const gaps: { at: number; seconds: number; count: number }[] = [];
  let lastPurchaseAt = 0;
  for (let i = 1; i < samples.length; i++) {
    const grew = samples[i].fleetSize - samples[i - 1].fleetSize;
    if (grew <= 0) continue;
    gaps.push({ at: samples[i].t, seconds: samples[i].t - lastPurchaseAt, count: grew });
    lastPurchaseAt = samples[i].t;
  }
  const trailing = ARC_SECONDS - lastPurchaseAt;

  console.log('Producer — pacing probe (8h, shipping ladder, real engine)');
  console.log(`Sampled every sim-second; ${gaps.length} purchase events.\n`);

  // ── 1. Channel occupancy, weighted by time ──────────────────────────────
  console.log('═══ 1. Channel occupancy, weighted by time spent ═══\n');
  const byChannel = new Map<string, number>();
  const add = (seconds: number): void => {
    const channel = classifyFlowChannel(seconds);
    byChannel.set(channel, (byChannel.get(channel) ?? 0) + seconds);
  };
  for (const gap of gaps) add(gap.seconds);
  if (trailing > 0) add(trailing);

  const totalSeconds = [...byChannel.values()].reduce((a, b) => a + b, 0);
  let engaged = 0;
  const ORDER = ['arousal', 'flow', 'flow-upper', 'boredom', 'frustration', 'breakdown'];
  for (const channel of ORDER) {
    const seconds = byChannel.get(channel) ?? 0;
    if (seconds === 0) continue;
    if (ENGAGED.has(channel)) engaged += seconds;
    const pct = (seconds / totalSeconds) * 100;
    console.log(
      `  ${col(channel, 14)}${pad(hms(seconds), 10)}${pad(pct.toFixed(1) + '%', 8)}  ${'█'.repeat(Math.max(0, Math.round(pct / 2.5)))}`,
    );
  }
  console.log(`\n  engaged: ${((engaged / totalSeconds) * 100).toFixed(1)}% of the arc by time`);
  console.log(`  longest single gap: ${hms(Math.max(...gaps.map((g) => g.seconds), trailing))}`);

  // ── 2. The arc, half hour by half hour ──────────────────────────────────
  console.log('\n═══ 2. The arc, half hour by half hour ═══\n');
  console.log(
    `  ${col('elapsed', 11)}${pad('count', 6)}${pad('median beat', 13)}  ${col('channel', 13)}${pad('rate/s', 12)}${pad('ref', 5)}${pad('rev', 5)}`,
  );
  for (let mark = 1800; mark <= ARC_SECONDS; mark += 1800) {
    const inWindow = gaps.filter((g) => g.at > mark - 1800 && g.at <= mark);
    const at = samples[Math.min(mark, samples.length - 1)];
    const median = inWindow.length
      ? [...inWindow].sort((a, b) => a.seconds - b.seconds)[Math.floor(inWindow.length / 2)].seconds
      : 1800;
    console.log(
      `  ${col(hms(mark), 11)}${pad(
        inWindow.reduce((a, g) => a + g.count, 0),
        6,
      )}${pad(median.toFixed(0) + 's', 13)}  ${col(classifyFlowChannel(median), 13)}${pad(at.totalRate.toExponential(2), 12)}${pad(at.refinementsOwned, 5)}${pad(at.revisionsEarned, 5)}`,
    );
  }

  // ── 3. Content coverage ─────────────────────────────────────────────────
  // The question the beat map cannot ask: once the last refinement and the last
  // revision are reached, the rest of the arc is deepening with nothing new
  // arriving. That interval is a content decision, not a tuning one.
  console.log('\n═══ 3. Content coverage ═══\n');
  const lastNew = (pick: (r: ArcReading) => number, total: number, label: string): number => {
    let last = 0;
    for (let i = 1; i < samples.length; i++) {
      if (pick(samples[i]) > pick(samples[i - 1])) last = samples[i].t;
    }
    const final = pick(samples[samples.length - 1]);
    console.log(
      `  ${col(label, 14)}${pad(`${final}/${total}`, 8)}  last arrived ${hms(last)}` +
        `   (${((last / ARC_SECONDS) * 100).toFixed(0)}% into the arc)`,
    );
    return last;
  };
  const lastRef = lastNew((r) => r.refinementsOwned, REFINEMENTS.length, 'refinements');
  const lastRev = lastNew((r) => r.revisionsEarned, REVISIONS.length, 'revisions');
  const dry = ARC_SECONDS - Math.max(lastRef, lastRev);
  console.log(
    `\n  nothing new arrives for the last ${hms(dry)} — ` +
      `${((dry / ARC_SECONDS) * 100).toFixed(0)}% of the budgeted arc.`,
  );
  console.log(
    `  unbought at 8h: ${REFINEMENTS.length - (samples[samples.length - 1]?.refinementsOwned ?? 0)} refinement(s), ` +
      `${REVISIONS.length - (samples[samples.length - 1]?.revisionsEarned ?? 0)} revision(s).`,
  );

  // ── 4. Whose beats were those? ──────────────────────────────────────────
  // § 1 measures the interval between *purchases*, and after dispatch opens the
  // purchaser is the swarm. `classifyFlowChannel` bands a beat the player is
  // supposed to feel, so past the hand-off § 1 describes the economy's tempo
  // rather than anyone's attention. The beats a player still perceives once
  // allocation is gone are the discrete ones: a class appearing, a revision
  // firing, a refinement becoming affordable. Those are counted here.
  console.log('\n═══ 4. Whose beats were those? ═══\n');
  const handoff = arc.automationTierAt.get('assisted') ?? 0;
  const auto = gaps.filter((g) => g.at > handoff).reduce((a, g) => a + g.count, 0);
  console.log(
    `  hand-off at ${hms(handoff)} — ${auto} of ${gaps.reduce((a, g) => a + g.count, 0)} purchases ` +
      `(${((auto / gaps.reduce((a, g) => a + g.count, 0)) * 100).toFixed(0)}%) were the dispatcher's, not the player's.`,
  );

  const perceived: number[] = [...arc.classAt.values()];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].refinementsOwned > samples[i - 1].refinementsOwned) perceived.push(samples[i].t);
    if (samples[i].revisionsEarned > samples[i - 1].revisionsEarned) perceived.push(samples[i].t);
  }
  perceived.sort((a, b) => a - b);

  const pByChannel = new Map<string, number>();
  let previous = 0;
  for (const at of perceived) {
    const channel = classifyFlowChannel(at - previous);
    pByChannel.set(channel, (pByChannel.get(channel) ?? 0) + (at - previous));
    previous = at;
  }
  const tail = ARC_SECONDS - previous;
  pByChannel.set(
    classifyFlowChannel(tail),
    (pByChannel.get(classifyFlowChannel(tail)) ?? 0) + tail,
  );

  console.log(
    `\n  ${perceived.length} perceptible events — class reveals, revisions, refinements:`,
  );
  let pEngaged = 0;
  for (const channel of ORDER) {
    const seconds = pByChannel.get(channel) ?? 0;
    if (seconds === 0) continue;
    if (ENGAGED.has(channel)) pEngaged += seconds;
    console.log(
      `  ${col(channel, 14)}${pad(hms(seconds), 10)}${pad(((seconds / ARC_SECONDS) * 100).toFixed(1) + '%', 8)}`,
    );
  }
  console.log(
    `\n  engaged on perceptible beats: ${((pEngaged / ARC_SECONDS) * 100).toFixed(1)}% ` +
      `(vs ${((engaged / totalSeconds) * 100).toFixed(1)}% on raw purchases)`,
  );
  console.log(
    '\n  The two are different questions. § 1 says the economy never stalls;\n' +
      '  § 4 says how often the player is given something to notice.\n',
  );
}

void main();

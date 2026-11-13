/**
 * Blank game — probe: shipping module vs the closed-form projection.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/_blank/balance/game-probe.ts`
 *
 * Drives the REAL assembled engine, the shipping `game/core` module, to each
 * beat of the arc and prints when it fired against when the projection
 * (`game-projection.ts`: amount(t) = ratePerSecond · t) says it should. A probe
 * is discovery, not a test — it prints, it does not assert, and a probe that
 * disagrees found something. Magnitudes stay here; `../sim/` specs behavior,
 * which is why those suites survive a retune.
 *
 * The probe is two calls, and a fork keeps both as its game grows:
 *
 * - `runBeatProbe`, the engine's balance harness, plays one fresh engine per
 *   beat and seed until the beat's predicate holds, and times it. Its siblings
 *   answer the other questions a pass asks: `runUntil` for one run,
 *   `runSensitivity` for a curve across a range, `replayLive` for the live
 *   loop's own dt.
 * - `renderArcTable`, from the balance toolkit (`@/balance`), prints the
 *   result. The same folder has `beatResultsOf`, for an arc probe that times
 *   every beat in one run, and the spread of a metric over a seed batch.
 *
 * Coarse tick (1s) per `AGENTS.md` § Balance methodology — no sub-second
 * fidelity needed for a linear rate.
 */

import { Decimal, runBeatProbe, type Beat } from '@open-loop/engine';
import { renderArcTable, seedBatch } from '@/balance';
import { bootTestEngine } from '@/test/bootTestEngine';
import { createGame } from '../modules';
import { CoreKey } from '../modules/core';
import { GAME_BALANCE } from '../data/game';

/** The arc's beats: the amounts it passes. A real game names its unlocks here. */
const MILESTONES = [60, 600, 3600];

/** The projection, inverted: the second the spine says an amount is reached. */
const predictedSecond = (amount: number): number => amount / GAME_BALANCE.ratePerSecond;

/** How far the shipping game may land from the projection and still match it. */
const TOLERANCE = 0.05;

const beats: Beat[] = MILESTONES.map((amount) => {
  const at = predictedSecond(amount);
  return {
    id: `amount ≥ ${amount}`,
    predicate: (engine) => Decimal.gte(engine.tryInject(CoreKey)!.amount.value, amount),
    // The window is the projection's own second, give or take the tolerance.
    // So "in window?" reads as "shipping = projection".
    tuningWindow: [at * (1 - TOLERANCE), at * (1 + TOLERANCE)],
  };
});

function main(): void {
  console.log('Blank game — core probe (shipping accrual vs closed-form projection)\n');

  const results = runBeatProbe({
    buildEngine: ({ seed }) =>
      bootTestEngine({
        modules: createGame().modules,
        seed,
        persistenceNamespacePrefix: 'game-probe',
      }).engine,
    beats,
    // This game has no random leg, so every seed fires on the same second. A
    // game with one reads the p5–p95 spread across the batch.
    seeds: seedBatch(3),
    maxSimTime: 2 * predictedSecond(Math.max(...MILESTONES)),
    tickDelta: 1,
  });

  console.log(renderArcTable(results));
  const drifted = results.filter((r) => !r.inTuningWindow).map((r) => r.beatId);
  console.log(
    drifted.length === 0
      ? `\n  MATCH ✓ every beat fires within ${TOLERANCE * 100}% of the projection`
      : `\n  DRIFT ✗ outside the projection's window: ${drifted.join(', ')}`,
  );
}

main();

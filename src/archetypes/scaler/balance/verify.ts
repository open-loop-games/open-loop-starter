/**
 * Scaler verify-driver — methodology #2 verify half.
 *
 * Per sub-pass: predicts beat firing times via `spec.ts`, simulates via
 * `runUntil(predicate)`, diffs predicted vs simulated time. Drift indicates
 * an engine-side primitive regression — same algebra, different answer.
 *
 * Per `archetypes/BALANCING.md § Theme 3 #2`: predictor and sim walk the
 * *same* schedule; the diff catches drift between the closed-form prediction
 * and the simulated trajectory. ECC sub-pass diffs spec-vs-spec (both closed-
 * form, no sim run); runes/prestige/transcend diff spec-vs-sim per event.
 *
 *   pnpm exec vite-node src/archetypes/scaler/balance/verify.ts
 */

import { Decimal, runUntil, type Engine } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import { eccTranscend, getPrestigePoints, getRuneLevel } from '../modules';
import { ECC_SAMPLE_COMPLETIONS } from './balance';
import {
  buildEccSpec,
  buildRunesSpec,
  predictFirstSpeedLevel1Sec,
  predictPrestigeAtCanonicalThreshold,
} from './spec';

const TICK_DELTA = 1; // 1s — minute-scale events; matches sim/runes-beat.test.ts.
const MAX_SIM_SECONDS = 24 * 60 * 60; // 24h cap.
const TOLERANCE_SEC = TICK_DELTA; // Same-tick prediction — bound to one tickDelta.

let engineCounter = 0;

function buildVerifyEngine(): Engine {
  const { engine } = createScalerEngine({
    persistenceNamespace: `scaler-verify-${++engineCounter}-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();
  return engine;
}

// ─── Runes — first-Speed-level-1 ─────────────────────────────────────────────

interface RunesDiffRow {
  metric: string;
  predictedSec: number;
  simulatedSec: number;
  deltaSec: number;
  withinTolerance: boolean;
}

function verifyRunes(): RunesDiffRow[] {
  const engine = buildVerifyEngine();
  const pp = getPrestigePoints();
  const speedLv = getRuneLevel('speed');

  let firstPrestigeAtSec = -1;
  let firstSpeedLv1AtSec = -1;

  const result = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (firstPrestigeAtSec < 0 && Decimal.gt(pp.cumulative?.value ?? 0, 0)) {
        firstPrestigeAtSec = simTime;
      }
      if (firstSpeedLv1AtSec < 0 && speedLv.value >= 1) {
        firstSpeedLv1AtSec = simTime;
      }
      return firstPrestigeAtSec >= 0 && firstSpeedLv1AtSec >= 0;
    },
  });

  if (result.terminated !== 'predicate') {
    engine.dispose();
    throw new Error(
      `verify(runes): prestige + Speed lv≥1 did not fire within ${MAX_SIM_SECONDS}s ` +
        `(prestigeAt=${firstPrestigeAtSec}, speedLv1At=${firstSpeedLv1AtSec})`,
    );
  }

  const predictedSpeedLv1 = predictFirstSpeedLevel1Sec(firstPrestigeAtSec);
  const deltaSpeedLv1 = firstSpeedLv1AtSec - predictedSpeedLv1;

  engine.dispose();

  return [
    {
      metric: 'first-Speed-level-1 (predicted = firstPrestige; same tick)',
      predictedSec: predictedSpeedLv1,
      simulatedSec: firstSpeedLv1AtSec,
      deltaSec: deltaSpeedLv1,
      withinTolerance: Math.abs(deltaSpeedLv1) <= TOLERANCE_SEC,
    },
  ];
}

// ─── ECC — Piecewise spec-vs-engine ──────────────────────────────────────────

interface EccDiffRow {
  completions: number;
  predicted: number;
  engine: number;
  delta: number;
  exact: boolean;
}

/**
 * Diff the spec walker's piecewise output against the engine's
 * `eccTranscend()` at every sample point. Both sides are closed-form
 * IEEE 754; equality is exact (zero tolerance) — drift means the spec
 * walker's regime expression or the engine's `eccTranscend` shifted.
 */
function verifyEcc(): EccDiffRow[] {
  const spec = buildEccSpec(ECC_SAMPLE_COMPLETIONS);
  return spec.map(({ completions, predicted }) => {
    const engine = eccTranscend(completions);
    const delta = engine - predicted;
    return { completions, predicted, engine, delta, exact: delta === 0 };
  });
}

// ─── Prestige — frozen-state predictor vs sim observation ───────────────────

interface PrestigeDiffRow {
  metric: string;
  predicted: string;
  observed: string;
  pass: boolean;
}

interface PrestigeObservation {
  firstPrestigeAtSec: number;
  /** Cumulative PP after first prestige — this is the canonical post-fire
   *  signal. The autobuyer fires the prestige conversion in the same tick
   *  the threshold crosses, so pre-fire `coinsThisPrestige` is not
   *  observable via post-tick polling (the reset has already wiped it to
   *  100 by the time `runUntil`'s predicate runs at tick end). */
  cumulativePPAtFire: Decimal;
}

function observeFirstPrestige(): {
  observation: PrestigeObservation;
  prediction: ReturnType<typeof predictPrestigeAtCanonicalThreshold>;
} {
  // Build the sim engine first so the module-level accessors bind to it,
  // then run the frozen-state predictor against the SAME engine. Sequencing
  // matters: scaler's module-level singletons re-bind on every
  // `createScalerEngine` call, so the predictor's query would land on a
  // disposed engine if it ran before this build.
  const engine = buildVerifyEngine();
  const prestigePoints = getPrestigePoints();

  const prediction = predictPrestigeAtCanonicalThreshold();

  const result = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: () => Decimal.gt(prestigePoints.cumulative?.value ?? 0, 0),
  });

  if (result.terminated !== 'predicate') {
    engine.dispose();
    throw new Error(`verify(prestige): first prestige did not fire within ${MAX_SIM_SECONDS}s`);
  }

  const cumulativePPAtFire = Decimal.fromValue(prestigePoints.cumulative?.value ?? 0);
  engine.dispose();

  return {
    prediction,
    observation: {
      firstPrestigeAtSec: result.elapsedSimulated,
      cumulativePPAtFire,
    },
  };
}

function verifyPrestige(): { rows: PrestigeDiffRow[]; observation: PrestigeObservation } {
  const { prediction, observation: obs } = observeFirstPrestige();

  const rows: PrestigeDiffRow[] = [
    {
      metric: 'frozen-state: gain at coinsThisPrestige=1e16 (predicted == 100 exact)',
      predicted: String(prediction.gainAtCoinThreshold),
      observed: `cumulative PP at first prestige = ${obs.cumulativePPAtFire.toString()}`,
      pass:
        prediction.gainAtCoinThreshold === prediction.canonicalGainThreshold &&
        Decimal.eq(obs.cumulativePPAtFire, prediction.canonicalGainThreshold),
    },
    {
      metric: 'frozen-state: canConvert at canonical threshold (predicted == true)',
      predicted: String(prediction.canConvertAtCoinThreshold),
      observed: 'sim observed prestige fire (cumulative > 0)',
      pass: prediction.canConvertAtCoinThreshold,
    },
    {
      metric: 'threshold-equivalence: anyOf branches fire same tick (1e16 ⇔ 100PP)',
      predicted: `gainAt(1e16) == ${prediction.canonicalGainThreshold} ⇒ disjunction collapses`,
      observed: `cumulative PP at fire == ${obs.cumulativePPAtFire.toString()}`,
      pass: Decimal.eq(obs.cumulativePPAtFire, prediction.canonicalGainThreshold),
    },
  ];

  return { rows, observation: obs };
}

// ─── Output ──────────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  if (Math.abs(sec) < 1) return `${sec.toFixed(2)}s`;
  const sign = sec < 0 ? '-' : '';
  const total = Math.round(Math.abs(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${sign}${m}m${String(s).padStart(2, '0')}s` : `${sign}${s}s`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function main(): void {
  const t0 = Date.now();
  console.log('# Scaler sim-verify — methodology #2 verification\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(`Tolerance: ${TOLERANCE_SEC}s per-metric (one tickDelta).\n`);

  // ─── Runes ────────────────────────────────────────────────────────────────
  console.log('## Runes sub-pass\n');
  const spec = buildRunesSpec();
  console.log(`  offeringsPerFirstPrestige = ${spec.offeringsPerFirstPrestige}`);
  console.log(`  per-rune level-1 prerequisites:`);
  for (const p of spec.predictions) {
    console.log(
      `    ${p.runeId.padEnd(18)}  expForLevel1=${p.expForLevel1.toExponential(3)}  ` +
        `prestigeFiringsToLevel1=${p.prestigeFiringsToLevel1}`,
    );
  }
  console.log();

  const runesRows = verifyRunes();
  console.log(
    renderTable(
      ['metric', 'predicted', 'simulated', 'Δ', 'pass'],
      runesRows.map((r) => [
        r.metric,
        fmt(r.predictedSec),
        fmt(r.simulatedSec),
        fmt(r.deltaSec),
        r.withinTolerance ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();

  const runesFailed = runesRows.filter((r) => !r.withinTolerance);
  if (runesFailed.length > 0) {
    console.log(
      `Tolerance breach: ${runesFailed.length}/${runesRows.length} metrics exceed ${TOLERANCE_SEC}s.`,
    );
    console.log(
      'Predictor and sim disagree. Algebra is unchanged; an engine-side ' +
        'primitive (computeEXPToLevel, offering accrual closure, autobuyer ' +
        'order) may have drifted. Investigate per-metric.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      `All ${runesRows.length} runes metrics within tolerance. Predictor agrees with sim.`,
    );
  }

  // ─── ECC ──────────────────────────────────────────────────────────────────
  console.log('\n## ECC piecewise sub-pass — spec walker vs engine\n');
  const eccRows = verifyEcc();
  console.log(
    renderTable(
      ['completions', 'predicted', 'engine', 'Δ', 'exact'],
      eccRows.map((r) => [
        String(r.completions),
        r.predicted.toString(),
        r.engine.toString(),
        r.delta.toString(),
        r.exact ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();

  const eccDrifted = eccRows.filter((r) => !r.exact);
  if (eccDrifted.length > 0) {
    console.log(`Exactness breach: ${eccDrifted.length}/${eccRows.length} sample points diverge.`);
    console.log(
      'Spec walker and engine disagree. Both compute the same canonical ' +
        'piecewise in IEEE 754 — drift means one regime expression mutated. ' +
        'Compare spec.ts `specEccTranscend` against `modules/challenges.ts` ' +
        '`eccTranscend`.',
    );
    process.exitCode = 1;
  } else {
    console.log(`All ${eccRows.length} ECC sample points match exactly.`);
  }

  // ─── Prestige ─────────────────────────────────────────────────────────────
  console.log('\n## Prestige sub-pass — frozen-state predictor vs sim\n');
  const { rows: prestigeRows, observation } = verifyPrestige();
  console.log(`  first prestige observed at simTime = ${fmt(observation.firstPrestigeAtSec)}`);
  console.log(
    `  long-run-avg PP rate (cycle 1) = ${observation.cumulativePPAtFire}/${fmt(observation.firstPrestigeAtSec)} = ` +
      `${(observation.cumulativePPAtFire.toNumber() / observation.firstPrestigeAtSec).toFixed(4)} PP/s\n`,
  );
  console.log(
    renderTable(
      ['metric', 'predicted', 'observed', 'pass'],
      prestigeRows.map((r) => [r.metric, r.predicted, r.observed, r.pass ? 'yes' : 'NO']),
    ),
  );
  console.log();

  const prestigeFailed = prestigeRows.filter((r) => !r.pass);
  if (prestigeFailed.length > 0) {
    console.log(
      `Threshold breach: ${prestigeFailed.length}/${prestigeRows.length} prestige metrics diverge.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `All ${prestigeRows.length} prestige metrics match. Canonical threshold equivalence confirmed.`,
    );
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();

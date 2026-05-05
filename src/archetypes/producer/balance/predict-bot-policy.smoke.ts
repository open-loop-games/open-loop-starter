/**
 * Bot-policy walker vs sim — research drift surface for methodology #2.
 *
 * For each beat 2/3/4/7, compares `arcWaypointsBotPolicy(engine, { predicate })`
 * against `runUntil(engine, predicate)` on a freshly-built sim engine. Both
 * read default data; no overrides pushed.
 *
 *   pnpm exec vite-node src/archetypes/producer/balance/predict-bot-policy.smoke.ts
 *
 * Predictor and sim are decoupled peers, both reading the engine's math
 * primitives at different layers (closed-form vs ticked). Drift between them
 * is expected output, not failure — visualizing the magnitude/shape of that
 * drift is what this driver is for. The earlier "fail at >2%" pass column
 * stays as a flag for "drift big enough to investigate," not as a regression
 * gate.
 */

import { runUntil } from 'open-loop-engine';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildProducerSimEngine } from './bot';
import { arcWaypointsBotPolicy } from './predict-bot-policy';

const BUDGET_SEC = BEAT_WINDOWS['beat-7']![1] * 2.5;

interface Row {
  beatId: string;
  predictorSec: number;
  simSec: number;
  deltaPct: number;
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  if (sec < 1) return `${sec.toFixed(2)}s`;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
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
  console.log('# Bot-policy walker vs sim — default tunables\n');

  const beatIds = ['beat-2', 'beat-3', 'beat-4', 'beat-7'];
  const rows: Row[] = [];

  for (const beatId of beatIds) {
    const beat = ARC_BEATS.find((b) => b.id === beatId);
    if (!beat) throw new Error(`no beat ${beatId}`);

    // Predictor
    const predEngine = buildProducerSimEngine();
    const tPred = Date.now();
    const predResult = arcWaypointsBotPolicy(predEngine, {
      predicate: () => beat.predicate(predEngine),
      budgetSec: BUDGET_SEC,
    });
    const predDt = Date.now() - tPred;

    // Sim
    const simEngine = buildProducerSimEngine();
    const tSim = Date.now();
    const simResult = runUntil({
      engine: simEngine,
      until: () => beat.predicate(simEngine),
      maxSimTime: BUDGET_SEC,
      tickDelta: 1,
    });
    const simDt = Date.now() - tSim;
    const simSec = simResult.terminated === 'predicate' ? simResult.elapsedSimulated : Infinity;

    const deltaPct =
      isFinite(predResult.fireTime) && isFinite(simSec) && simSec > 0
        ? Math.abs(predResult.fireTime - simSec) / simSec
        : Infinity;

    rows.push({
      beatId,
      predictorSec: predResult.fireTime,
      simSec,
      deltaPct,
    });

    console.log(
      `${beatId}: predictor ${fmt(predResult.fireTime)} (${predDt}ms) vs sim ${fmt(simSec)} (${simDt}ms) — Δ ${(deltaPct * 100).toFixed(2)}%`,
    );
  }

  console.log();
  console.log(
    renderTable(
      ['beat', 'predictor', 'sim', 'Δ%', 'flag(>2%)'],
      rows.map((r) => [
        r.beatId,
        fmt(r.predictorSec),
        fmt(r.simSec),
        `${(r.deltaPct * 100).toFixed(2)}%`,
        r.deltaPct > 0.02 ? 'investigate' : 'ok',
      ]),
    ),
  );

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();

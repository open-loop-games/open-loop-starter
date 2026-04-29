/**
 * Projector-vs-sim drift table — engine-truth tripwire for the closed-form
 * arc projector.
 *
 * For each enabled beat, runs both:
 *   - `projectArc` (closed-form, synthetic state) with optional resolved
 *     tunables.
 *   - `runUntil` against `buildLooperSimEngine` with the same tunables
 *     pushed onto `LooperTuningRegistryKey` and the strategy's
 *     `PlannerParams` written to `BalanceBotParamsKey`.
 *
 * Prints the per-beat fire-time diff (corrected projector seconds vs sim
 * seconds at `tickDelta = 1s`). Resolves OL-757's deferred uncertainty —
 * "projector-vs-sim drift bound for beats 6-8":
 *
 *   - If diffs stay at zero (or one engine-tick lag for queue-empty modes)
 *     across beats, the static-cost projector matches engine truth and
 *     the lock-in tests can pin EXACT-match per beat.
 *   - If beats 6-8 surface a per-loop accumulating drift, the magnitude
 *     here informs the option-A vs option-B decision (static-cost
 *     projector vs iterative-cost migration per OL-756 leaf-3a § static
 *     cost discipline).
 *
 * Discovery shape — vite-node, prints proposals, never mutates data.
 * Companion to `balance:solve:looper`. Run:
 * `pnpm balance:validate-projector:looper`.
 */

import { runUntil } from 'open-loop-engine';
import { DEFAULT_LOOPER_DATA } from '../data';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildLooperSimEngine, BalanceBotParamsKey, BalanceBotRecommendationKey } from './bot';
import { LooperTuningRegistryKey, type LooperTunables } from '../modules';
import {
  arcSimulatedFireSeconds,
  createBeatPredicates,
  projectArc,
  resolveTunables,
  type ProjectorProposal,
} from './projector';
import { type PlannerParams } from './planner';

// ─── Strategy params (mirrors solve.ts / bot.ts) ──────────────────────────

const STRATEGY_PARAMS: Record<string, PlannerParams> = {
  'farm-mana-pool': {
    progressionTarget: { roam: 2, trail: 2, acquaint: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 100,
    talentOverflowThreshold: 0,
  },
  'farm-gold-buffer': {
    progressionTarget: { acquaint: 2, roam: 1, trail: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 50,
    talentOverflowThreshold: 0,
  },
  'farm-talent': {
    progressionTarget: { roam: 1, acquaint: 1, trail: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 100,
    talentOverflowThreshold: 50,
  },
};

// ─── Validation gates ────────────────────────────────────────────────────
//
// Step the validator up beat-by-beat the same way the solver ramps. First
// rung: the strategy + tuning-set the solver currently outputs at rung 1
// (farm-mana-pool, balance/initialMana = 1025) under DEFAULT_PARAMS. Lift
// gates as solver convergence widens.

const VALIDATE_STRATEGY = 'farm-mana-pool';

/**
 * Resolved tunables for this validation pass — typically the solver's
 * apply-patch output. Empty map = baseline data, no perturbation.
 *
 * Mirror this from `balance:solve:looper`'s "Apply patch" section as the
 * solver ramp progresses; the diff table will then characterize drift
 * under the chosen knob set rather than under data defaults.
 */
const PROPOSED: ProjectorProposal = {
  // Rung 1 farm-mana-pool — uncomment after solve:looper converges:
  // 'balance/initialMana': 1025,
};

const ENABLED_BEATS: readonly string[] = [
  'beat-2',
  // 'beat-3', 'beat-4', 'beat-5', 'beat-6', 'beat-7', 'beat-8',  // ramp ↑
];

const ARC_MAX_LOOPS = 50;
const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;
const TICK_DELTA = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────

function toScope(p: ProjectorProposal): Partial<LooperTunables> {
  const scope: Partial<LooperTunables> = {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined) continue;
    scope[key as keyof LooperTunables] = () => value;
  }
  return scope;
}

interface DiffRow {
  beatId: string;
  window: [number, number];
  projected: number;
  sim: number;
  diffSec: number;
  inWindow: { proj: boolean; sim: boolean };
  notes: string;
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞ (never)';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `${fmt(w[0])}–${fmt(w[1])}`;
}

function fmtDiff(d: number): string {
  if (!isFinite(d)) return '∞';
  if (Math.abs(d) < 0.001) return '0';
  const sign = d >= 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(2)}s`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

// ─── Per-beat diff ───────────────────────────────────────────────────────

function diffBeat(beatId: string, params: PlannerParams, proposed: ProjectorProposal): DiffRow {
  const window = BEAT_WINDOWS[beatId]!;
  const tuning = resolveTunables(proposed);

  // Projector
  const predicates = createBeatPredicates(DEFAULT_LOOPER_DATA);
  const predicate = predicates[beatId];
  if (!predicate) throw new Error(`no synth predicate for ${beatId}`);
  const arc = projectArc(DEFAULT_LOOPER_DATA, params, {
    breakPredicate: predicate,
    maxLoops: ARC_MAX_LOOPS,
    tuning,
  });
  const projected = arc.fireSec === undefined ? Infinity : arcSimulatedFireSeconds(arc, TICK_DELTA);

  // Sim — same params + same tunables, engine-truth oracle.
  const engine = buildLooperSimEngine();
  const registry = engine.tryInject(LooperTuningRegistryKey)!;
  const rec = engine.tryInject(BalanceBotRecommendationKey)!;
  const paramsHandle = engine.tryInject(BalanceBotParamsKey)!;

  rec.autoApply.value = false;
  paramsHandle.write(params);
  const cleanup = registry.pushScope(`validate:${beatId}`, toScope(proposed));
  let sim: number;
  try {
    const beat = ARC_BEATS.find((b) => b.id === beatId)!;
    const { terminated, elapsedSimulated } = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: BUDGET_SEC,
      tickDelta: TICK_DELTA,
    });
    sim = terminated === 'predicate' ? elapsedSimulated : Infinity;
  } finally {
    cleanup();
  }
  if (registry.scopeDepth !== 0) {
    throw new Error(`scope leak after ${beatId} diff: depth=${registry.scopeDepth}`);
  }

  const diffSec = isFinite(projected) && isFinite(sim) ? sim - projected : Infinity;
  const notes: string[] = [];
  if (!isFinite(projected) && !isFinite(sim)) notes.push('both never fire');
  else if (!isFinite(projected)) notes.push('projector never fires');
  else if (!isFinite(sim)) notes.push('sim never fires');
  else if (Math.abs(diffSec) < 0.001) notes.push('EXACT match');
  else if (Math.abs(diffSec) <= TICK_DELTA + 0.001) notes.push('within tickDelta');
  else notes.push('drift > tickDelta');

  return {
    beatId,
    window,
    projected,
    sim,
    diffSec,
    inWindow: {
      proj: isFinite(projected) && projected >= window[0] && projected <= window[1],
      sim: isFinite(sim) && sim >= window[0] && sim <= window[1],
    },
    notes: notes.join(', '),
  };
}

// ─── main ────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();

  const params = STRATEGY_PARAMS[VALIDATE_STRATEGY];
  if (!params) throw new Error(`unknown strategy ${VALIDATE_STRATEGY}`);

  console.log('# Looper projector-vs-sim drift table\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(`Strategy:  ${VALIDATE_STRATEGY}`);
  console.log(`tickDelta: ${TICK_DELTA}s`);
  console.log(`Beats:     ${ENABLED_BEATS.join(', ')}\n`);

  if (Object.keys(PROPOSED).length === 0) {
    console.log('Tunable overrides: (none — projecting against data baseline)\n');
  } else {
    console.log('Tunable overrides:');
    for (const [k, v] of Object.entries(PROPOSED)) {
      if (v === undefined) continue;
      console.log(`  ${k} = ${v}`);
    }
    console.log();
  }

  const rows: DiffRow[] = [];
  for (const beatId of ENABLED_BEATS) {
    rows.push(diffBeat(beatId, params, PROPOSED));
  }

  console.log(
    renderTable(
      ['beat', 'window', 'projector', 'sim', 'diff', 'proj?', 'sim?', 'notes'],
      rows.map((r) => [
        r.beatId,
        fmtWindow(r.window),
        fmt(r.projected),
        fmt(r.sim),
        fmtDiff(r.diffSec),
        r.inWindow.proj ? 'yes' : 'NO',
        r.inWindow.sim ? 'yes' : 'NO',
        r.notes,
      ]),
    ),
  );
  console.log();

  const drifts = rows.filter(
    (r) => isFinite(r.diffSec) && Math.abs(r.diffSec) > TICK_DELTA + 0.001,
  );
  if (drifts.length > 0) {
    console.log(
      `Drift > tickDelta: ${drifts.length} beat(s). Magnitude informs option-A ` +
        `(static-cost projector + bounded drift) vs option-B (iterative-cost ` +
        `migration per OL-756 leaf-3a) decision. Review beats 6-8 specifically — ` +
        `the OL-757 carry-forward uncertainty centered on per-loop integer-rounding ` +
        `accumulation in those late-arc fire times.\n`,
    );
  } else {
    console.log('All enabled beats within tickDelta — projector tracks engine truth.\n');
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();

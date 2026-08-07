/**
 * Tug sim-driven balance probes.
 *
 * Methodology-#1 math-only locks (probes 1, 2) ride single-pass `runUntil`
 * with deterministic bots (believability 0/0). Methodology-#3 (probe 3 —
 * signature counter-strong sensitivity) and methodology-#5 (probe 4 —
 * income-upgrade ROI snapshot) ride `runMatrixUntil` over N seeds.
 * Probe 5 is a methodology-#1 distribution lock on match-duration p50;
 * probe 6 is a framework-correctness archetype-dominance gate (no design
 * knob; the methodology kit doesn't currently name this shape — see
 * `../BALANCING.md`).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/arc-probe.ts`.
 * Prints per-probe pass/fail report;
 * surfaces drift for human inspection rather than blocking on it.
 *
 * **Math-only vs MC split:**
 *   - math-only: `runUntil({engine, until, maxSimTime, tickDelta})` once
 *     per (perturbation, beat). Bot uses production-zero believability so
 *     the run is fully deterministic; one run suffices.
 *   - MC: `runMatrixUntil({cells, seeds, until, maxSimTime})` with N
 *     seeds; aggregate distribution-statistics read off
 *     `cell.aggregate.metrics['tug-outcome.<key>']` (per-run analyzer
 *     captures averaged) and `cell.aggregate.terminationTime.p50`
 *     (built-in termination distribution). MC probes use sim-default
 *     believability through `buildTugSimEngine` (suboptimality 0.20,
 *     cadence jitter 0.25) — the cookbook stalemate-breaker for the
 *     counter-vs-greed cell.
 *
 * **Signature probe = counter-strong-sensitivity.** Sweeps
 * `counter-matrix/strongCounter ∈ [0.5, 1.5]` against player-side
 * (counter persona) win-rate vs a concentrating opponent (greed). Counter-
 * pick *count* is approximately invariant to the sweep; the sweep affects
 * combat-damage scaling at counter-cells (`lane.ts::adjustCell`),
 * which shifts win-rate continuously. Emits a proposed `strongCounter`
 * scalar where win-rate clears a depth-floor with elbow-room before
 * saturation. strongCounter is a design parameter (matrix decisiveness),
 * not an AI knob.
 */

import {
  runMatrixUntil,
  runSensitivity,
  runUntil,
  type CellResult,
  type Engine,
  type UntilCell,
} from '@open-loop/engine';
import {
  BASE_INCOME_RATE,
  IncomeUpgradeRoiKey,
  TugTuningRegistryKey,
  type TugTunables,
} from '../modules';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
  type TugSimOptions,
} from './bot';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { DEFAULT_TUG_DATA } from '../data';
import type { PersonaKey } from '../data/personality';

const PRIMARY_SEEDS = 20;
const DURATION_PROBE_SEEDS = 30;
const MAX_MATCH_SIM_TIME_SEC = 35 * 60;
const TICK_DELTA_SEC = 1.0;

/** 30-min match limit (inlined in `modules/match.ts`). Cached here for
 *  probe-side gating against match duration. */
const MATCH_TIME_LIMIT_SEC = 30 * 60;

/** Default base income rate (inlined in `modules/income.ts`). Probe 1's
 *  multiplier sweep computes target perturbed values from this baseline. */

/** Deterministic-bot bundle for math-only probes — zero believability. */
const DETERMINISTIC: Partial<import('../data/types').TugBelievability> = {
  suboptimalityRate: 0,
  cadenceJitterScale: 0,
};

/** Fixed seed list — locked here so the regression-lock layer in
 *  `sim/instrumentation.test.ts` can `runMatrixUntil({ seeds: TUG_SEEDS, ... })`
 *  with reproducible outcomes. */
export const TUG_SEEDS = Array.from({ length: PRIMARY_SEEDS }, (_, i) => i + 1);
export const TUG_DURATION_SEEDS = Array.from({ length: DURATION_PROBE_SEEDS }, (_, i) => i + 1);

// ─── Probe primitives ────────────────────────────────────────────────────

interface ProbeRow {
  name: string;
  reading: string;
  expected: string;
  pass: boolean;
  details?: string;
}

let activeCapture: OutcomeCapture | null = null;

/** Build an UntilCell perturbed via `pushScope` on the tuning registry.
 *  Engine-canonical pattern — no separate override path. */
function buildCell(
  name: string,
  simOptions?: TugSimOptions,
  scopePerturbations?: Partial<TugTunables>,
): UntilCell {
  return {
    name,
    buildEngine: () => buildTugSimEngine(simOptions),
    analyzers: (engine: Engine) => {
      const capture = createOutcomeCapture(engine);
      activeCapture = capture;
      let cleanup: (() => void) | null = null;
      if (scopePerturbations) {
        const reg = engine.tryInject(TugTuningRegistryKey)!;
        cleanup = reg.pushScope(`probe:${name}`, scopePerturbations);
      }
      return [
        createOutcomeAnalyzer(capture),
        {
          name: 'scope-cleanup',
          onEnd: () => {
            cleanup?.();
            cleanup = null;
          },
          summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
        },
      ];
    },
    tickDelta: TICK_DELTA_SEC,
  };
}

function runMatchScopeMC(
  name: string,
  seeds: number[],
  simOptions?: TugSimOptions,
  scopePerturbations?: Partial<TugTunables>,
): CellResult {
  const result = runMatrixUntil({
    cells: [buildCell(name, simOptions, scopePerturbations)],
    seeds,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });
  return result.cells[0]!;
}

/** Time the first occurrence of a beat predicate under given tunable scope.
 *  Used by the math-only probes (1, 2). Builds a deterministic engine,
 *  pushes scope, runs to the predicate, restores. */
function fireBeatUnderScope(beatId: string, scope: Partial<TugTunables>): number {
  const engine = buildTugSimEngine({ believability: DETERMINISTIC });
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) return Infinity;
  const reg = engine.tryInject(TugTuningRegistryKey)!;
  const cleanup = reg.pushScope(`probe:beat-${beatId}`, scope);
  try {
    const result = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: MAX_MATCH_SIM_TIME_SEC,
      tickDelta: TICK_DELTA_SEC,
    });
    return result.terminated === 'predicate' ? result.elapsedSimulated : Infinity;
  } finally {
    cleanup();
  }
}

// ─── Probe 1 — income-rate-baseline (methodology #1 math-only) ───────────

interface BeatFireRow {
  beatId: string;
  multiplier: number;
  fireSec: number;
  windowLo: number;
  windowHi: number;
  inWindow: boolean;
}

function runIncomeRateBaselineProbe(): { rows: BeatFireRow[]; pass: boolean } {
  const multipliers = [0.75, 1.0, 1.25];
  const beats = ['beat-1', 'beat-2', 'beat-4'];
  const rows: BeatFireRow[] = [];
  for (const m of multipliers) {
    const scope: Partial<TugTunables> = {
      'balance/baseIncomeRate': () => Number(BASE_INCOME_RATE) * m,
    };
    for (const beatId of beats) {
      const [windowLo, windowHi] = BEAT_WINDOWS[beatId]!;
      const fireSec = fireBeatUnderScope(beatId, scope);
      const tolLo = windowLo * 0.8;
      const tolHi = windowHi * 1.2;
      rows.push({
        beatId,
        multiplier: m,
        fireSec,
        windowLo: tolLo,
        windowHi: tolHi,
        inWindow: isFinite(fireSec) && fireSec >= tolLo && fireSec <= tolHi,
      });
    }
  }
  const pass = rows.every((r) => r.inWindow);
  return { rows, pass };
}

// ─── Probe 2 — unit-cost-scaling (methodology #1 math-only) ──────────────

function runUnitCostScalingProbe(): { rows: BeatFireRow[]; pass: boolean } {
  const multipliers = [0.85, 1.0, 1.15];
  const beats = ['beat-2', 'beat-3', 'beat-5'];
  const rows: BeatFireRow[] = [];
  for (const m of multipliers) {
    // Sweep ALL units uniformly — multiplier applied to every unit's cost
    // via per-unit scope key.
    const scope: Partial<TugTunables> = {};
    for (const u of DEFAULT_TUG_DATA.units) {
      const baseCost = Number(u.cost);
      scope[`units/${u.id}/cost`] = () => baseCost * m;
    }
    for (const beatId of beats) {
      const [windowLo, windowHi] = BEAT_WINDOWS[beatId]!;
      const fireSec = fireBeatUnderScope(beatId, scope);
      const tolLo = windowLo * 0.75;
      const tolHi = windowHi * 1.25;
      rows.push({
        beatId,
        multiplier: m,
        fireSec,
        windowLo: tolLo,
        windowHi: tolHi,
        inWindow: isFinite(fireSec) && fireSec >= tolLo && fireSec <= tolHi,
      });
    }
  }
  return { rows, pass: rows.every((r) => r.inWindow) };
}

// ─── Probe 3/SIGNATURE — counter-strong-sensitivity (methodology #3) ─────

const STRONG_SWEEP = [0.5, 0.75, 1.0, 1.25, 1.5];
/** Depth-floor target: counter-side wins more often than not at this
 *  strongCounter — the matrix is decisive enough to give counter a
 *  meaningful edge against a concentrating opponent. Reads off
 *  `isFirstPlayerWin.avg` from the analyzer. */
const WINRATE_TARGET = 0.5;
/** Saturation guard: the next sweep step must shift win-rate by at
 *  least this absolute amount; otherwise the curve has flattened and
 *  the proposed value is past the elbow. Absolute (not relative)
 *  because win-rate is bounded [0, 1]. */
const SATURATION_DELTA = 0.05;

interface CounterStrongRow {
  variant: string;
  strong: number;
  winRate: number;
  winRateDelta: number | null;
  monotonicNonDecreasing: boolean;
}

interface CounterStrongResult {
  rows: CounterStrongRow[];
  baselineWinRate: number;
  proposedStrong: number | null;
  proposedReason: string;
  pass: boolean;
}

function runCounterStrongSensitivityProbe(): CounterStrongResult {
  const offValues = STRONG_SWEEP.filter((s) => s !== 1.0);
  const sweep = runSensitivity({
    baseline: buildCell(`strong=${(1.0).toFixed(2)}`, undefined, {
      'counter-matrix/strongCounter': () => 1.0,
    }),
    variants: offValues.map((s) => ({
      name: `strong=${s.toFixed(2)}`,
      patch: () =>
        buildCell(`strong=${s.toFixed(2)}`, undefined, {
          'counter-matrix/strongCounter': () => s,
        }),
    })),
    seeds: TUG_SEEDS,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });

  const winByStrong = new Map<number, number>();
  winByStrong.set(1.0, sweep.baseline.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0);
  for (let i = 0; i < offValues.length; i++) {
    const strong = offValues[i]!;
    const v = sweep.variants[i]!;
    winByStrong.set(strong, v.cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0);
  }

  const rows: CounterStrongRow[] = [];
  let prevWin: number | null = null;
  let monotonic = true;
  for (const strong of STRONG_SWEEP) {
    const winRate = winByStrong.get(strong)!;
    const delta = prevWin != null ? winRate - prevWin : null;
    const stepNonDecreasing = prevWin == null || winRate + 1e-9 >= prevWin;
    if (!stepNonDecreasing) monotonic = false;
    rows.push({
      variant: `strong=${strong.toFixed(2)}`,
      strong,
      winRate,
      winRateDelta: delta,
      monotonicNonDecreasing: stepNonDecreasing,
    });
    prevWin = winRate;
  }

  // Proposed strongCounter: smallest sweep value where win-rate ≥
  // WINRATE_TARGET AND the next sweep step's absolute delta ≥
  // SATURATION_DELTA (curve hasn't flattened — we want headroom, not
  // saturation).
  let proposedStrong: number | null = null;
  let proposedReason = 'curve flat / saturated everywhere';
  for (let i = 0; i < STRONG_SWEEP.length; i++) {
    const strong = STRONG_SWEEP[i]!;
    const winRate = winByStrong.get(strong)!;
    if (winRate < WINRATE_TARGET) continue;
    if (i === STRONG_SWEEP.length - 1) {
      proposedReason = 'depth target hit at sweep ceiling — extend range to test saturation';
      break;
    }
    const nextWin = winByStrong.get(STRONG_SWEEP[i + 1]!)!;
    const delta = nextWin - winRate;
    if (delta >= SATURATION_DELTA) {
      proposedStrong = strong;
      proposedReason = `depth target ${WINRATE_TARGET} hit; next-step abs Δ ${(delta * 100).toFixed(1)}pp ≥ ${(SATURATION_DELTA * 100).toFixed(0)}pp saturation guard`;
      break;
    }
  }

  const baselineWinRate = winByStrong.get(1.0)!;
  // Pass criterion is monotonicity — the framework correctly sweeps and
  // produces a non-decreasing curve. The proposed-strongCounter scalar
  // is a forward-looking output; it may report null when the underlying
  // data balance dominates the sweep signal (currently the case at
  // default data — see bot.ts § Known limitation). The follow-up
  // procedural-persona tester-seat agent owns balance discovery for the
  // SIGNATURE matchup.
  const pass = monotonic;

  return {
    rows,
    baselineWinRate,
    proposedStrong,
    proposedReason,
    pass,
  };
}

// ─── Probe 4 — income-upgrade-roi (methodology #5 fixed-strategy ROI) ────

const REFINERY_1_COST_SWEEP = [200, 400, 800, 1600, 3200];

/** Conservative gate: half the match time limit. Probe 5 asserts the
 *  empirical p50 lands in [50%, 95%] of the limit, so anything that fails
 *  to cross over by this threshold definitely doesn't pay off in a
 *  typical match. */
const MATCH_DURATION_P50_SEC = MATCH_TIME_LIMIT_SEC * 0.5;

/** Analytical defaults at engine-build state (no tiers bought, so
 *  `currentRate = baseRate = 8/s` for every tier). These are what the
 *  ROI ComputedRefs return at `buildTugSimEngine()`. */
const ANALYTICAL_DEFAULT_PAYBACK: Record<string, number> = {
  'refinery-1': 400 / (8 * 0.25), // 200s
  'refinery-2': 350 / (8 * 0.4), // 109.375s
  'refinery-3': 1200 / (8 * 0.3), // 500s
};
const ANALYTICAL_DEFAULT_CROSSOVER: Record<string, number> = {
  'refinery-1': (400 / (8 * 0.25)) * 1.25, // 250s
  'refinery-2': (350 / (8 * 0.4)) * 1.4, // 153.125s
  'refinery-3': (1200 / (8 * 0.3)) * 1.3, // 650s
};
const ROI_TOLERANCE = 0.05;

const REFINERY_1_DEFAULT_COST = Number(
  DEFAULT_TUG_DATA.incomeUpgrades.find((u) => u.id === 'refinery-1')!.cost,
);

interface RoiTierRow {
  tierId: string;
  paybackSec: number;
  crossoverSec: number;
  /** Within ±ROI_TOLERANCE of analytical default. `null` for perturbed
   *  tiers (analytical baseline doesn't apply). */
  paybackInTolerance: boolean | null;
  crossoverInTolerance: boolean | null;
  crossoverWithinMatch: boolean;
}

interface RoiVariantRow {
  variant: string;
  refinery1Cost: number;
  tiers: RoiTierRow[];
  pass: boolean;
}

interface RoiResult {
  rows: RoiVariantRow[];
  /** Smallest swept refinery-1 cost where crossover exceeds the match-
   *  duration gate. The analytical "elbow" — the answer to "above what
   *  cost does macro-vs-rush collapse?" `null` when no swept value
   *  trips the gate (current data is well below the elbow). */
  proposedMaxCost: number | null;
  proposedReason: string;
  pass: boolean;
}

/** Read ROI snapshot under optional cost perturbation. Builds an engine,
 *  pushes scope if requested, reads computed-refs (no simulation), tears
 *  down. */
function readRoiSnapshot(
  scope?: Partial<TugTunables>,
): { tierId: string; paybackSec: number; crossoverSec: number }[] {
  const engine = buildTugSimEngine();
  const reg = engine.tryInject(TugTuningRegistryKey)!;
  const cleanup = scope ? reg.pushScope('probe:roi-snapshot', scope) : null;
  try {
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player);
    if (!roi) throw new Error('IncomeUpgradeRoiKey.player not provided by engine');
    return DEFAULT_TUG_DATA.incomeUpgrades.map((def) => {
      const m = roi.get(def.id);
      if (!m) throw new Error(`No ROI metrics for ${def.id}`);
      return {
        tierId: def.id,
        paybackSec: m.paybackSeconds.value,
        crossoverSec: m.crossoverSeconds.value,
      };
    });
  } finally {
    cleanup?.();
  }
}

function runIncomeUpgradeRoiProbe(): RoiResult {
  const rows: RoiVariantRow[] = [];

  // Default variant — all tiers locked against analytical baselines.
  const defaultSnap = readRoiSnapshot();
  const defaultTiers: RoiTierRow[] = defaultSnap.map(({ tierId, paybackSec, crossoverSec }) => {
    const expectedP = ANALYTICAL_DEFAULT_PAYBACK[tierId]!;
    const expectedC = ANALYTICAL_DEFAULT_CROSSOVER[tierId]!;
    return {
      tierId,
      paybackSec,
      crossoverSec,
      paybackInTolerance: Math.abs(paybackSec - expectedP) / expectedP <= ROI_TOLERANCE,
      crossoverInTolerance: Math.abs(crossoverSec - expectedC) / expectedC <= ROI_TOLERANCE,
      crossoverWithinMatch: crossoverSec < MATCH_DURATION_P50_SEC,
    };
  });
  rows.push({
    variant: 'default',
    refinery1Cost: REFINERY_1_DEFAULT_COST,
    tiers: defaultTiers,
    pass:
      defaultTiers.every((t) => t.paybackInTolerance && t.crossoverInTolerance) &&
      defaultTiers.find((t) => t.tierId === 'refinery-1')!.crossoverWithinMatch,
  });

  // Cost-perturbed variants — only refinery-1 perturbed; tiers 2/3 are
  // unchanged (so analytical-tolerance fields are null).
  for (const cost of REFINERY_1_COST_SWEEP) {
    if (cost === REFINERY_1_DEFAULT_COST) continue;
    const scope: Partial<TugTunables> = {
      'income-upgrades/refinery-1/cost': () => cost,
    };
    const snap = readRoiSnapshot(scope);
    const tiers: RoiTierRow[] = snap.map(({ tierId, paybackSec, crossoverSec }) => ({
      tierId,
      paybackSec,
      crossoverSec,
      paybackInTolerance: tierId === 'refinery-1' ? null : true,
      crossoverInTolerance: tierId === 'refinery-1' ? null : true,
      crossoverWithinMatch: crossoverSec < MATCH_DURATION_P50_SEC,
    }));
    rows.push({
      variant: `cost=${cost}`,
      refinery1Cost: cost,
      tiers,
      pass: tiers.find((t) => t.tierId === 'refinery-1')!.crossoverWithinMatch,
    });
  }

  let proposedMaxCost: number | null = null;
  let proposedReason = `all swept costs cross over within ${MATCH_DURATION_P50_SEC.toFixed(0)}s`;
  for (const row of rows) {
    const r1 = row.tiers.find((t) => t.tierId === 'refinery-1')!;
    if (!r1.crossoverWithinMatch) {
      proposedMaxCost = row.refinery1Cost;
      proposedReason = `refinery-1 crossover ${r1.crossoverSec.toFixed(1)}s ≥ match-p50 ${MATCH_DURATION_P50_SEC.toFixed(0)}s`;
      break;
    }
  }

  return {
    rows,
    proposedMaxCost,
    proposedReason,
    pass: rows[0]!.pass && rows.every((r) => r.pass),
  };
}

// ─── Probe 5 — match-duration-bound (methodology #1 distribution lock) ───

interface DurationResult {
  p50Sec: number;
  limitSec: number;
  windowLo: number;
  windowHi: number;
  /** Fraction of seeds whose first match ended with `firstMatchOutcome
   *  === 'time-limit'`. Read off the analyzer (not engine-level
   *  `terminationCounts.maxSimTime` — the engine terminates with
   *  `predicate` once `matchEnded` fires, regardless of in-game
   *  outcome). */
  timeLimitRate: number;
  pass: boolean;
}

function runMatchDurationBoundProbe(): DurationResult {
  const cell = runMatchScopeMC('default', TUG_DURATION_SEEDS);
  const p50Sec = cell.aggregate.terminationTime?.p50 ?? 0;
  const limitSec = MATCH_TIME_LIMIT_SEC;
  const windowLo = limitSec * 0.5;
  const windowHi = limitSec * 0.95;
  const timeLimitRate = cell.aggregate.metrics['tug-outcome.isFirstTimeLimit']?.avg ?? 0;
  return {
    p50Sec,
    limitSec,
    windowLo,
    windowHi,
    timeLimitRate,
    pass: timeLimitRate === 0 && p50Sec >= windowLo && p50Sec <= windowHi,
  };
}

// ─── Probe 6 — per-archetype dominance (framework-correctness gate) ──────

const DOMINANCE_PERSONAS: PersonaKey[] = ['mass', 'greed', 'counter', 'tech'];
const DOMINANCE_SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Threshold for `max single-archetype share` across the persona meta.
 *  Direct Strike's tier-list framing measures dominance via human curation
 *  (pick_freq × win_rate rankings). The 0.40 derivation is from uniform
 *  expectation: with 6 unit archetypes, uniform = 1/6 ≈ 0.167; 2.4× over-
 *  representation lands at ≈ 0.40 — the boundary where one archetype is
 *  meaningfully over-represented in winning compositions without being
 *  absolutely degenerate. The probe `pass` criterion is framework-
 *  correctness (Cartesian runs end-to-end, histogram populated); the
 *  threshold reading is informational. */
const MAX_ARCHETYPE_SHARE_TARGET = 0.4;

interface DominanceCellRow {
  playerPersona: PersonaKey;
  aiPersona: PersonaKey;
  winRate: number;
  spawnShareInWin: Record<string, number>;
  totalSpawnsInWin: number;
  topArchetype: string | null;
  topShare: number;
}

interface DominanceResult {
  cells: DominanceCellRow[];
  aggregateShare: Record<string, number>;
  maxShare: number;
  maxShareArchetype: string | null;
  winRateMatrix: Record<PersonaKey, Record<PersonaKey, number>>;
  pass: boolean;
}

function runArchetypeDominanceProbe(): DominanceResult {
  const archetypeIds = DEFAULT_TUG_DATA.units.map((u) => u.id);
  const cells: UntilCell[] = [];
  for (const playerPersona of DOMINANCE_PERSONAS) {
    for (const aiPersona of DOMINANCE_PERSONAS) {
      cells.push(
        buildCell(`p=${playerPersona}/ai=${aiPersona}`, {
          player: playerPersona,
          ai: aiPersona,
        }),
      );
    }
  }
  const result = runMatrixUntil({
    cells,
    seeds: DOMINANCE_SEEDS,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });

  const cellRows: DominanceCellRow[] = [];
  const winRateMatrix: Record<PersonaKey, Record<PersonaKey, number>> = {
    mass: {} as Record<PersonaKey, number>,
    greed: {} as Record<PersonaKey, number>,
    counter: {} as Record<PersonaKey, number>,
    tech: {} as Record<PersonaKey, number>,
  };
  const totalByArchetype: Record<string, number> = Object.fromEntries(
    archetypeIds.map((id) => [id, 0]),
  );
  let grandTotal = 0;

  let cellIdx = 0;
  for (const playerPersona of DOMINANCE_PERSONAS) {
    for (const aiPersona of DOMINANCE_PERSONAS) {
      const cell = result.cells[cellIdx++]!;
      const winRate = cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
      winRateMatrix[playerPersona][aiPersona] = winRate;

      const spawnsInWinByArchetype: Record<string, number> = {};
      let cellTotalInWin = 0;
      for (const id of archetypeIds) {
        const avg = cell.aggregate.metrics[`tug-outcome.spawnsInWin.player.${id}`]?.avg ?? 0;
        spawnsInWinByArchetype[id] = avg;
        cellTotalInWin += avg;
        totalByArchetype[id] += avg;
      }
      grandTotal += cellTotalInWin;

      const shareInWin: Record<string, number> = {};
      for (const id of archetypeIds) {
        shareInWin[id] = cellTotalInWin > 0 ? spawnsInWinByArchetype[id]! / cellTotalInWin : 0;
      }
      let topArchetype: string | null = null;
      let topShare = 0;
      if (cellTotalInWin > 0) {
        for (const id of archetypeIds) {
          if (shareInWin[id]! > topShare) {
            topShare = shareInWin[id]!;
            topArchetype = id;
          }
        }
      }
      cellRows.push({
        playerPersona,
        aiPersona,
        winRate,
        spawnShareInWin: shareInWin,
        totalSpawnsInWin: cellTotalInWin * DOMINANCE_SEEDS.length,
        topArchetype,
        topShare,
      });
    }
  }

  const aggregateShare: Record<string, number> = {};
  for (const id of archetypeIds) {
    aggregateShare[id] = grandTotal > 0 ? totalByArchetype[id]! / grandTotal : 0;
  }
  let maxShare = 0;
  let maxShareArchetype: string | null = null;
  for (const id of archetypeIds) {
    if (aggregateShare[id]! > maxShare) {
      maxShare = aggregateShare[id]!;
      maxShareArchetype = id;
    }
  }

  const allCellsCompleted = result.cells.every((c) => c.runs.length === DOMINANCE_SEEDS.length);
  const someCellHasWins = grandTotal > 0;
  const pass = allCellsCompleted && someCellHasWins;

  return {
    cells: cellRows,
    aggregateShare,
    maxShare,
    maxShareArchetype,
    winRateMatrix,
    pass,
  };
}

// ─── Reporter ────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n)) return '∞';
  return n.toFixed(decimals);
}

function fmtSec(s: number): string {
  if (!isFinite(s)) return '∞';
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
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
  console.log('# Tug balance probes\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    `PRIMARY_SEEDS = ${PRIMARY_SEEDS} (CI half-width ≈ ${(0.98 / Math.sqrt(PRIMARY_SEEDS)).toFixed(2)} at p=0.5)`,
  );
  console.log(`DURATION_PROBE_SEEDS = ${DURATION_PROBE_SEEDS}`);
  console.log(`TICK_DELTA_SEC = ${TICK_DELTA_SEC}\n`);
  console.log(
    'Math-only probes (1, 2) override believability to 0/0 (deterministic); MC probes (3, 5) use sim-default 0.20/0.25 from buildTugSimEngine.\n',
  );

  const summary: ProbeRow[] = [];

  console.log('## Probe 1 — income-rate-baseline (methodology #1 math-only ±25%)\n');
  const p1 = runIncomeRateBaselineProbe();
  console.log(
    renderTable(
      ['beat', 'mult', 'fired', 'window', 'in?'],
      p1.rows.map((r) => [
        r.beatId,
        `×${r.multiplier}`,
        fmtSec(r.fireSec),
        `[${fmtSec(r.windowLo)}, ${fmtSec(r.windowHi)}]`,
        r.inWindow ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  summary.push({
    name: 'income-rate-baseline',
    reading: `${p1.rows.filter((r) => r.inWindow).length}/${p1.rows.length} in window`,
    expected: 'all in window',
    pass: p1.pass,
  });

  console.log('## Probe 2 — unit-cost-scaling (methodology #1 math-only ±15%)\n');
  const p2 = runUnitCostScalingProbe();
  console.log(
    renderTable(
      ['beat', 'mult', 'fired', 'window', 'in?'],
      p2.rows.map((r) => [
        r.beatId,
        `×${r.multiplier}`,
        fmtSec(r.fireSec),
        `[${fmtSec(r.windowLo)}, ${fmtSec(r.windowHi)}]`,
        r.inWindow ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  summary.push({
    name: 'unit-cost-scaling',
    reading: `${p2.rows.filter((r) => r.inWindow).length}/${p2.rows.length} in window`,
    expected: 'all in window',
    pass: p2.pass,
  });

  console.log('## Probe 3 — counter-strong-sensitivity (methodology #3, N=20) [SIGNATURE]\n');
  const p3 = runCounterStrongSensitivityProbe();
  console.log(
    renderTable(
      ['variant', 'strong', 'win-rate', 'abs Δ vs prev', 'monotonic?'],
      p3.rows.map((r) => [
        r.variant,
        r.strong.toFixed(2),
        fmt(r.winRate),
        r.winRateDelta != null
          ? `${r.winRateDelta >= 0 ? '+' : ''}${(r.winRateDelta * 100).toFixed(1)}pp`
          : '—',
        r.monotonicNonDecreasing ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  console.log(
    `baseline (strong=1.0) win-rate = ${fmt(p3.baselineWinRate)} (target ≥ ${WINRATE_TARGET.toFixed(2)})`,
  );
  console.log(
    `proposed strongCounter ≈ ${p3.proposedStrong != null ? p3.proposedStrong.toFixed(2) : 'null'}`,
  );
  console.log(`reason: ${p3.proposedReason}`);
  console.log(`pass: ${p3.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'counter-strong-sensitivity',
    reading: `win-rate@strong=1.0 = ${fmt(p3.baselineWinRate)}; proposed strong = ${p3.proposedStrong != null ? p3.proposedStrong.toFixed(2) : 'null'}`,
    expected: 'monotonic non-decreasing curve across sweep',
    pass: p3.pass,
  });

  console.log('## Probe 4 — income-upgrade-roi (methodology #5)\n');
  const p4 = runIncomeUpgradeRoiProbe();
  const roiHeader = ['variant', 'tier', 'payback', 'crossover', 'in match?'];
  const roiRows: string[][] = [];
  for (const v of p4.rows) {
    for (const t of v.tiers) {
      const inMatch = t.crossoverWithinMatch ? 'yes' : 'NO';
      roiRows.push([v.variant, t.tierId, fmtSec(t.paybackSec), fmtSec(t.crossoverSec), inMatch]);
    }
  }
  console.log(renderTable(roiHeader, roiRows));
  console.log();
  console.log(
    `match-duration gate = ${fmtSec(MATCH_DURATION_P50_SEC)} (50% of ${fmtSec(MATCH_TIME_LIMIT_SEC)} limit)`,
  );
  console.log(
    `proposed max refinery-1 cost ≈ ${p4.proposedMaxCost != null ? p4.proposedMaxCost.toFixed(0) : 'unbounded in sweep range'}`,
  );
  console.log(`reason: ${p4.proposedReason}`);
  console.log(`pass: ${p4.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'income-upgrade-roi',
    reading: `default tiers in tolerance; elbow ≈ ${p4.proposedMaxCost != null ? p4.proposedMaxCost.toFixed(0) : 'unbounded'}`,
    expected: 'all variants cross over within match-p50 gate',
    pass: p4.pass,
  });

  console.log('## Probe 5 — match-duration-bound (methodology #1 distribution lock, N=30)\n');
  const p5 = runMatchDurationBoundProbe();
  console.log(
    `p50 = ${fmtSec(p5.p50Sec)} of ${fmtSec(p5.limitSec)} limit (target ∈ [${fmtSec(p5.windowLo)}, ${fmtSec(p5.windowHi)}])`,
  );
  console.log(
    `time-limit rate: ${fmt(p5.timeLimitRate)} (target 0 — matches resolve by win/loss, not stalemate)`,
  );
  console.log(`pass: ${p5.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'match-duration-bound',
    reading: `p50=${fmtSec(p5.p50Sec)}, time-limit-rate=${fmt(p5.timeLimitRate)}`,
    expected: 'p50 ∈ [50%, 95%] of limit, time-limit rate = 0',
    pass: p5.pass,
  });

  console.log(
    `## Probe 6 — per-archetype dominance (framework-correctness, ${DOMINANCE_PERSONAS.length}×${DOMINANCE_PERSONAS.length} personas, N=${DOMINANCE_SEEDS.length})\n`,
  );
  const p6 = runArchetypeDominanceProbe();
  console.log('### Win-rate matrix (player rows × ai cols)\n');
  console.log(
    renderTable(
      ['player ↓ / ai →', ...DOMINANCE_PERSONAS],
      DOMINANCE_PERSONAS.map((pp) => [
        pp,
        ...DOMINANCE_PERSONAS.map((ap) => fmt(p6.winRateMatrix[pp][ap])),
      ]),
    ),
  );
  console.log();

  console.log('### Aggregate share (player-side spawns in winning matches)\n');
  const archetypeIds = DEFAULT_TUG_DATA.units.map((u) => u.id);
  const uniformExpectation = 1 / archetypeIds.length;
  console.log(
    renderTable(
      ['archetype', 'agg share', 'vs uniform', 'over-rep?'],
      archetypeIds.map((id) => {
        const share = p6.aggregateShare[id] ?? 0;
        const ratio = uniformExpectation > 0 ? share / uniformExpectation : 0;
        return [
          id,
          fmt(share),
          `${ratio.toFixed(2)}×`,
          share >= MAX_ARCHETYPE_SHARE_TARGET ? 'YES' : 'no',
        ];
      }),
    ),
  );
  console.log();
  console.log(
    `uniform expectation = 1/${archetypeIds.length} ≈ ${uniformExpectation.toFixed(3)}; threshold = ${MAX_ARCHETYPE_SHARE_TARGET.toFixed(2)} (≈ ${(MAX_ARCHETYPE_SHARE_TARGET / uniformExpectation).toFixed(1)}× uniform)`,
  );
  console.log(
    `max single-archetype share = ${fmt(p6.maxShare)} (${p6.maxShareArchetype ?? 'none'})`,
  );
  const dominanceVerdict =
    p6.maxShare >= MAX_ARCHETYPE_SHARE_TARGET
      ? `dominant: ${p6.maxShareArchetype} carries ≥${(MAX_ARCHETYPE_SHARE_TARGET * 100).toFixed(0)}% of player wins across the meta`
      : 'no archetype exceeds threshold';
  console.log(`reading: ${dominanceVerdict}`);
  console.log(`pass (framework-correctness): ${p6.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'per-archetype-dominance',
    reading: `max share = ${fmt(p6.maxShare)} (${p6.maxShareArchetype ?? 'none'}); threshold ${MAX_ARCHETYPE_SHARE_TARGET.toFixed(2)}`,
    expected: 'all cells run, ≥1 cell has wins (framework-correctness)',
    pass: p6.pass,
    details: dominanceVerdict,
  });

  console.log('## Summary\n');
  console.log(
    renderTable(
      ['probe', 'reading', 'expected', 'pass'],
      summary.map((s) => [s.name, s.reading, s.expected, s.pass ? 'yes' : 'NO']),
    ),
  );
  const failed = summary.filter((s) => !s.pass);
  console.log();
  if (failed.length > 0) {
    console.log(
      `${failed.length}/${summary.length} probes FAILED — investigate above for details.`,
    );
  } else {
    console.log(`All ${summary.length} probes pass.`);
  }
  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();

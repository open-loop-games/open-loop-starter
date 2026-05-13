/**
 * Tug archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * Per `archetypes/BALANCING.md`:
 *   identity   (this file)            FIXED
 *   scaffolding (beats.ts, data/*.ts, bot.ts)   MUTABLE
 *   tools      (tune.ts, probes.ts)  searches
 *   locks      (sim/balance.probe.test.ts)  regressions after choices land
 *
 * Tug is the **first Tier-C archetype** — adversarial, distribution-statistic
 * balance. The next four Tier-C archetypes (Defender, Survivor, Packer,
 * Auto-battler, Director, Explorer, Scripter) crib this file's shape and
 * the four-file template (`shape.ts` / `beats.ts` / `bot.ts` / `tune.ts`).
 *
 * Worked example for cross-reference: `src/archetypes/ambient/balance/`
 * (Tier A — single-engine deterministic single-knob bisection). The
 * difference at every layer is documented inline in this file's prose
 * blocks below.
 *
 * Key Tug identity points (vs Ambient / Tier A):
 *   - Adversarial — every match is the player vs an AI policy whose
 *     income mirrors the player's. Outcome is stochastic.
 *   - Cumulative-across-matches arc — ~75min cumulative sim-time covers
 *     2–4 matches at the default 30-min match limit.
 *   - Signature climax is **counter-matrix sharpness sensitivity** — the
 *     mean counter-pivots-per-match curve across a strongCounter sweep
 *     under believability-calibrated counter-vs-counter mirror play. Not
 *     a single fire-time and not a single number; a sample curve plus a
 *     proposed-elbow scalar.
 *   - Counter matrix is data, not chain — N×N damage-type multipliers
 *     read by the per-tick combat resolver as a 2D array lookup.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a
   *  phase may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Tug. Forks changing any of this are no longer the
 * Tug archetype — they've forked into a sibling or hybrid.
 */
export const TUG_IDENTITY = {
  archetypeId: 'tug' as const,
  /** ~75min cumulative across matches; covers the headless beat span at
   *  the default 30-min match limit and ~5–25 min mean match-length. */
  arcBudgetSec: 75 * 60,
  /** Minimum content cardinality the counter-matrix depth depends on.
   *  4 archetypes is the minimum that supports a non-trivial RPS+1 counter
   *  cycle. Skeleton ships with 6 (RPS+2-axis crossed). */
  minUnitArchetypes: 4,
  /** Signature climax metric. Numeric magnitudes (sweep range, depth
   *  target) are mutable; the metric *shape* — mean counter-pivots
   *  across a `counter-matrix/strongCounter ∈ [0.5, 1.5]` sweep, with N
   *  seeds and believability calibration — is the archetype centerpiece
   *  (`counter-strong-sensitivity` probe in `balance/probes.ts`). */
  signatureMetric:
    'counter-matrix sharpness sensitivity — mean counter-pivots per match curve over strongCounter ∈ [0.5, 1.5] across N=20 seeds with believability calibration (counter-strong-sensitivity probe)',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete beat predicate and minute-window expressing
 * each phase live in `beats.ts` and are mutable.
 */
export const TUG_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-unit-purchased',
    order: 1,
    intent:
      'First unit purchased — onboarding; the shop → send loop becomes concrete in under a minute',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-auto-resolve-combat',
    order: 2,
    intent:
      "First auto-resolve combat observed — validates 'set composition, watch it play out'; the archetype's defining moment",
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-counter-pivot',
    order: 3,
    intent:
      'First counter-pivot — introduces the counter-matrix depth; this is where the archetype stops being an auto-battler and starts being a strategy game',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-match-completion',
    order: 4,
    intent: 'First match completion — arc half-way point; proves the match-loop closes cleanly',
    currentBeatId: 'beat-4',
  },
  {
    id: 'second-match-composition-pivot',
    order: 5,
    intent: 'Second-match composition pivot — demonstrates that learning transfers across matches',
    currentBeatId: 'beat-5',
  },
  {
    id: 'counter-mastery-demonstrated',
    order: 6,
    intent:
      'Counter-type mastery demonstrated — the player has internalized at least two counter matchups',
    currentBeatId: 'beat-6',
  },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function.
 *
 * **N/A for Tug.** Flow-band scoring measures pacing in a solo-archetype
 * arc — how much of the player's continuous time is spent in flow vs
 * boredom vs frustration. Tug's arc is *adversarial* and *cumulative
 * across matches*: the within-match pacing question is answered by
 * `match-duration-bound` (median match length ∈ [50%, 95%] of the time
 * limit), and the cross-match pacing question is answered by
 * `ai-difficulty-symmetry` (player-win-rate band). Neither is a flow-band
 * shape, so leaf 6 declines to author a synthetic flow score.
 *
 * If a future Tug fork instruments per-match flow telemetry (player
 * input cadence, decision-density), revisit. Not relevant for the
 * skeleton-default no-meta-progression headless sim.
 */
export const FLOW_BAND_SCORE: null = null;

/* ─── Tier-C — what tool replaces the solver and why ────────────────────
 *
 * Per `archetypes/BALANCING.md` § Tier C, Tier-C archetypes "document
 * what tool replaces the solver and why." Tug is the **first concrete
 * worked example**; this prose is the convention for every Tier-C
 * archetype after.
 *
 * **What replaces `solve.ts`:** `tune.ts` running a **sensitivity sweep
 * + curve characterizer** over `runMatrixUntil`. Tug's signature is the
 * shape of the matrix-sharpness response curve, not a single number — a
 * 1-D bisection pinned to one target loses the elbow-room information
 * that justifies the proposed value. The Tier-A Ambient pattern (single-
 * engine `importSave` reset + `runUntil` per sample) does not apply
 * because Tug's outcomes are stochastic — adversarial matches with AI
 * policy + combat ordering produce a distribution. `runMatrixUntil` is
 * the matching primitive: it builds a fresh engine per `(cell, seed)`,
 * runs each to a shared predicate, and aggregates termination-time stats
 * + per-run analyzer output as first-class fields.
 *
 * **Local `runSensitivityUntil` helper.** The engine ships
 * `runSensitivity` (`harness/run-sensitivity.ts:27`) — a thin baseline-
 * vs-variants wrapper that runs `runMatrix` (fixed ticks) and computes
 * `diffAggregates` per variant. Tug needs match-end predicate
 * termination, not fixed ticks; `probes.ts::runSensitivityUntil`
 * emulates the same shape over `runMatrixUntil + diffAggregates`. The
 * helper stays leaf-local; graduate to the engine when a second
 * predicate-bounded sensitivity consumer surfaces (filed as a follow-up).
 *
 * **Statistics read off `runMatrixUntil`:**
 *   - **Mean counter-pivots per match (signature)**: per-run
 *     `firstMatchCounterPivots` captured by the `tug-outcome` analyzer
 *     (subscribes to `match.on('matchEnded', ...)` to read pre-reset).
 *     Aggregated as `cell.aggregate.metrics['tug-outcome.firstMatchCounterPivots'].avg`.
 *   - **Per-variant deltas**: `diffAggregates(variantCell.aggregate,
 *     baselineCell.aggregate)` — `{absolute, relative}` per metric. The
 *     SIGNATURE probe reads relative deltas to assess saturation.
 *   - **Match-length-p50**: read directly off
 *     `cell.aggregate.terminationTime.p50`. Match-duration-bound probe
 *     verifies believability calibration broke the mirror stalemate
 *     (`terminationCounts.maxSimTime === 0`).
 *
 * **Why the analyzer + matchEnded pattern, not a `cell.runs[i].engine`
 * read:** `cell.runs[i]` has no `engine` field — the harness builds
 * engine per `(cell, seed)` and discards it. `match.end()` synchronously
 * calls `reset.reset()` which wipes `outcome.value` back to `null`, so
 * even a shared closure-bound engine ref would read null. The analyzer
 * pattern captures outcome at the matchEnded event (fired pre-reset by
 * match.ts:153–158) and surfaces it via `summarize()` into
 * `analyzerResults`, where the harness aggregator picks it up.
 *
 * **Believability calibration as the stalemate-breaker.** The production-
 * mirror sim default (`opponentPersona = { player: 'counter', ai:
 * 'counter' }`) deadlocks at parity with deterministic bots — every seed
 * hits the time limit. Per `composition-cookbook/parameterized-
 * personality.md` § Believability-calibration discipline, the recipe is
 * to add a calibration bundle (suboptimality + cadence jitter) at the
 * decision layer, separate from the personality parameters. Production
 * data has `believability: { suboptimalityRate: 0, cadenceJitterScale: 0 }`
 * (deterministic AI, predictable for the human player); sim default is
 * `0.05/0.15`. Probe 5 (`match-duration-bound`) is the post-calibration
 * verification — `terminationCounts.maxSimTime === 0` means calibration
 * broke the deadlock.
 *
 * **Sweep ranges and N-seeds.** SIGNATURE sweep is
 * `strongCounter ∈ {0.5, 0.75, 1.0, 1.25, 1.5}` at N=20 (binomial CI
 * half-width ≈ 0.22 at p=0.5 — coarser than the curve resolution we
 * care about, but sufficient for monotonicity + elbow detection). Bump
 * to N=50 (CI ≈ 0.14) if the curve is too noisy to identify an elbow
 * cleanly across the sample points.
 *
 * **No Gauss-Seidel multi-pass.** Tier-C response surfaces are noisy;
 * chained bisection across multiple noisy axes doesn't converge cleanly.
 * Secondary axes are filed as follow-up probes (per-archetype dominance,
 * income-upgrade ROI), each shaped to its own design property.
 *
 * **Math-only locks alongside MC locks:** probes 1–2
 * (`income-rate-baseline`, `unit-cost-scaling`) ride the same
 * `runUntil`-driven single-pass beat-time pattern as Producer/Ambient,
 * with believability overridden to 0/0 for determinism. They live in
 * `sim/balance.probe.test.ts` next to the MC distribution locks but
 * use a different harness path (`runUntil` for fire-time,
 * `runMatrixUntil` for distribution). The split is documented inline
 * in `probes.ts`.
 */

/**
 * Pointer — the mutable scaffolding layers `tune.ts` perturbs:
 *
 *   - `../data/balance.ts`         baseIncomeRate, aiIncomeMultiplier,
 *                                  fortress.hp (via `fortress/hp` tunable
 *                                  registered in fortress.ts)
 *   - `../data/units.ts`           per-unit cost (representative ids
 *                                  marine + siege-tank registered as
 *                                  tunables in modules/units.ts)
 *   - `../data/income.ts`          income-upgrade tier multipliers + costs
 *                                  (representative id refinery-1 registered)
 *   - `./beats.ts`                 BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                   composition-pivot policy, open archetype
 *
 * All subject to co-reshape when a phase from `TUG_PHASES` can't be
 * expressed under the current scaffolding (per BALANCING.md § Retune vs
 * reshape).
 */

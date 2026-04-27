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
 *   - Cumulative-across-matches arc — 2h cumulative sim-time covers
 *     ~4 matches at the default 30-min match limit.
 *   - Signature climax is **player-win-rate ∈ [0.4, 0.6]** under
 *     symmetric income — not a single fire-time. Distribution-statistic
 *     band, not point match.
 *   - Counter matrix is data, not chain — N×N damage-type multipliers
 *     read by the per-tick combat resolver as a 2D array lookup.
 *   - Bimodal arc closure — beat 7 fires either on first meta-progression
 *     unlock (`metaProgressionEnabled: true`) or on counter-mastery
 *     invariant (3+ counter-pivots in any single match) for the no-meta
 *     skeleton default.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted verbatim from
   *  `archetypes/tug.md` § 4. */
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
  /** 2 sim-hours, cumulative across matches per `archetypes/tug.md` § 4.
   *  At the default 30-min match limit and ~5–25 min mean match-length,
   *  2h covers roughly 4–10 matches' worth of cumulative play. */
  arcBudgetSec: 2 * 60 * 60,
  /** Minimum content cardinality the counter-matrix depth depends on.
   *  4 archetypes is the minimum that supports a non-trivial RPS+1 counter
   *  cycle. Skeleton ships with 6 (RPS+2-axis crossed). */
  minUnitArchetypes: 4,
  /** Signature climax metric. Numeric magnitudes (the band edges) are
   *  mutable; the metric *shape* — Bernoulli player-win outcome over a
   *  Monte Carlo of N seeds at default vars — is the archetype centerpiece
   *  per `archetypes/tug.md` § 6 probe `ai-difficulty-symmetry`. */
  signatureMetric:
    'player-win-rate ∈ [0.4, 0.6] across N=20 seeds at default vars (ai-difficulty-symmetry probe)',
} as const;

/**
 * Ordered player-experience phases, from `archetypes/tug.md` § 4. The order
 * and intent of each are part of the identity; the concrete beat predicate
 * and minute-window expressing each phase live in `beats.ts` and are
 * mutable.
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
  {
    id: 'arc-closure',
    order: 7,
    intent:
      "Arc closure — first meta-progression milestone OR counter-mastery invariant; the 'one-loop-seen' moment",
    currentBeatId: 'beat-7',
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
 * **What replaces `solve.ts`:** `tune.ts` using `bisectTuner` over a
 * **distribution-statistic sampler** that wraps `runMatrixUntil`. The
 * Tier-A Ambient pattern (single-engine `importSave` reset + `runUntil`
 * per sample) does not apply because Tug's outcomes are stochastic —
 * adversarial matches with AI policy + combat ordering produce a
 * *distribution* of outcomes, not a single fire-time. `runMatrixUntil`
 * is the matching primitive: it builds a fresh engine per `(cell, seed)`,
 * runs each to a shared predicate, and aggregates termination-time stats
 * + per-run analyzer output as first-class fields.
 *
 * **Statistics read off `runMatrixUntil`:**
 *   - **Player-win-rate**: Bernoulli p̂ over N seeds. Computed from a
 *     per-run `tug-outcome` analyzer (see `bot.ts::createOutcomeAnalyzer`)
 *     that subscribes to `match.on('matchEnded', ...)` and captures
 *     `payload.outcome` *before* the auto-reset clears it. Aggregated
 *     via `cell.aggregate.metrics['tug-outcome.isPlayerWin'].avg`.
 *   - **Match-length-p50**: read directly off
 *     `cell.aggregate.terminationTime.p50` — first-class field on
 *     {@link CellAggregate}. The `until` predicate is
 *     `() => !match.inMatch.value` (true after `match.end()` runs the
 *     reset and `inMatch` flips to false).
 *   - **Counter-pivot success-rate**: per-match `counterPivotsThisMatch`
 *     captured by the same analyzer; mean across player-win runs gives
 *     the rate at which a player win used counter pivots.
 *
 * **Why the analyzer + matchEnded pattern, not a `cell.runs[i].engine`
 * read:** the worked example in `archetypes/tug.md § 7` showing
 * `r.engine.tryInject(MatchKey)` is sketch-incorrect — `cell.runs[i]` has
 * no `engine` field (the harness builds engine per `(cell, seed)` and
 * discards it). `match.end()` synchronously calls `reset.reset()` which
 * wipes `outcome.value` back to `null`, so even a shared closure-bound
 * engine ref would read null. The analyzer pattern captures outcome at
 * the matchEnded event (fired pre-reset by match.ts:153–158) and surfaces
 * it via `summarize()` into `analyzerResults`, where the harness
 * aggregator picks it up.
 *
 * **Convergence (band-hit, not single-value match):** for
 * distribution-statistic bisection, "converged" means the win-rate band
 * [0.4, 0.6] is hit. The binomial-CI trade-off matters here — at p=0.5
 * with N=20 seeds, the 95% binomial CI half-width is ≈ 0.22, *wider*
 * than the band. The tolerance band is wider than the CI **by design**:
 * we want a clear off-target signal, not statistical certainty. Leaf 6
 * starts at N=20 (CI half-width ≈ 0.22) and bumps to N=50 (CI half-width
 * ≈ 0.14) only if `bisectTuner` thrashes — meaning the sampler reports
 * inconsistent in-band/out-of-band readings across iterations on what
 * should be a stable axis. Document the chosen N in `tune.ts`'s output
 * banner.
 *
 * **No Gauss-Seidel multi-pass for the primary tuner.** The Tier-A
 * solver chains beat proposals across 3 passes because beat coupling
 * matters under deterministic single-knob bisection. Tier-C response
 * surfaces are *noisy* — Gauss-Seidel converges poorly under noise.
 * AI-income is the dominant axis; secondary tuners (unit costs,
 * counter-matrix scalars) run as **separate single-axis bisections**,
 * not chained. If a future Tug variant needs joint tuning, that's a
 * Tier-C pattern question — file then.
 *
 * **`bisectTuner` semantic stretch:** `bisectTuner.targetSec` and
 * `tolSec` are typed as seconds because Tier-A tuners always bisect a
 * fire-time. Tug's primary tuner passes `targetSec: 0.5` (target
 * win-rate) and `tolSec: 0.1` (band half-width) — generic 1-D bisection
 * math, semantic mismatch in the names. Inline-comment at the call site;
 * if a second Tier-C archetype wants the same shape, file a
 * `bisect1D` candidate-primitives entry then.
 *
 * **Math-only locks alongside MC locks:** probes 1–2
 * (`income-rate-baseline`, `unit-cost-scaling`) ride the same
 * `runUntil`-driven single-pass beat-time pattern as Producer/Ambient.
 * They live in `sim/balance.probe.test.ts` next to the MC distribution
 * locks but use a different harness path (`runUntil` for fire-time,
 * `runMatrixUntil` for distribution). The split is documented inline in
 * `probes.ts`.
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

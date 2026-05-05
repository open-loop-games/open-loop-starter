/**
 * <Archetype> archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * This file is scaffold. Copy the whole `_template/balance/` directory to
 * `src/archetypes/<archetype>/balance/` and fill in the `TODO(fill-in)`
 * sites. Working examples:
 *
 *   - `src/archetypes/producer/balance/` — methodology #1 + #2 (triangular
 *     multi-resource walker; Pure-decomposable subsystem).
 *   - `src/archetypes/ambient/balance/` — methodology #1 only (100%
 *     Pure-decomposable subsystem; no closed-form predictor needed).
 *
 * Engine-as-oracle posture (`archetypes/BALANCING.md § Engine as oracle`):
 *   The solver never reimplements game mechanics. Two query modes:
 *     - Frozen-state queries (methodology #2): build engine, mutate
 *       persistent refs, don't tick; read getCost(1)/getTotalRate. See
 *       spec.ts + predict.ts for the walker shapes.
 *     - Deterministic-bot-driven runs (methodology #1): install a
 *       deterministic bot module; runUntil predicates fire. See bot.ts +
 *       solve.ts for the bisection skeleton.
 *   Both modes hit the same engine instance via the same chain math.
 *
 * Layered contract (see `archetypes/BALANCING.md`):
 *   identity   (this file)                 FIXED
 *   scaffolding (beats.ts, data/*.ts, bot.ts) MUTABLE
 *   tools      (solve.ts methodology #1; predict.ts/spec.ts/verify.ts
 *               methodology #2)            search
 *   locks      (sim/*.probe.test.ts)       regressions after choices land
 *
 * When a phase can't be expressed under current scaffolding, coordinate a
 * reshape across layers — retune vs reshape content vs reshape predicate vs
 * move the phase — instead of contorting one constant.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted verbatim from
   *  `archetypes/<archetype>.md` § 4 — do not paraphrase. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a
   *  phase may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about this archetype. Forks changing any of this are no
 * longer this archetype — they've forked into a sibling or hybrid.
 */
export const ARCHETYPE_IDENTITY = {
  // TODO(fill-in): archetype id matching the directory + doc file stem
  archetypeId: '<archetype>' as const,

  // TODO(fill-in): arc budget in sim-seconds, from <archetype>.md § 1.
  // Forks compressing below ~70% or extending past ~150% of this are
  // reshaping, not retuning.
  arcBudgetSec: 0,

  // TODO(fill-in): minimum content cardinalities this archetype is
  // sensitive to. Soft floors — scaffolding may ship with more. Example
  // from producer: minContinuousProducers=5, minGlobalUpgrades=4.

  // TODO(fill-in): signature climax metric. Expression referencing engine
  // state. Numeric magnitude is mutable; the metric shape is fixed.
  signatureMetric: '<expression>',
} as const;

/**
 * Ordered player-experience phases, from `<archetype>.md` § 4. The order
 * and intent of each are part of the identity; the concrete beat predicate
 * and minute-window expressing each phase live in `beats.ts` and are
 * mutable.
 */
export const ARCHETYPE_PHASES: readonly PhaseIntent[] = [
  // TODO(fill-in): one entry per phase, in order.
  // {
  //   id: 'first-<thing>',
  //   order: 1,
  //   intent: 'Onboarding — core feedback loop confirmed',
  //   currentBeatId: 'beat-1',
  // },
] as const;

/**
 * Per-subsystem methodology declaration. An archetype is a composition of
 * subsystems with their own rate functions; closed-form discipline applies
 * per subsystem (`closed-form-progression/thesis.md § 3`). This surface
 * tells the solver/predictor which walker to use per subsystem.
 *
 * Bucket vocabulary: the 9-bucket walk from `BALANCING.md § Theme 2` —
 * Pure / Piecewise / CoupledState / StrategySpace / Stochastic /
 * DiscreteEvent / NetworkTopological / OptimalStopping /
 * CombinatorialSelection.
 *
 * Methodology vocabulary: 6 methodologies from `BALANCING.md § Theme 3` —
 * '#1' spec/calibrate/lock, '#2' math-first sim-verify, '#3' sensitivity
 * sweep, '#4' distribution sampling, '#5' best-response/ROI, '#6' pure sim
 * discovery. '#1+#2' when both halves apply (predictor + bisection bridge).
 *
 * Composition row (when methodology #2 applies): the walker shape from
 * `rate-function-algebra.md § 6.7` recap — 'triangular' / 'piecewise' /
 * 'modifier-product' / 'series' / 'sum' / null when not #2.
 *
 * Canonical surface: which numeric values are perturbation surface vs.
 * locked-from-canonical (`BALANCING.md § Canonical numbers are not
 * tunable`). Solvers operate only on the declared-invention surface.
 */
export interface SubsystemMethodology {
  /** Subsystem id; archetype-local. */
  id: string;
  /** 9-bucket classification per `subsystem-inventory.md § 3`. */
  bucket:
    | 'Pure'
    | 'Piecewise'
    | 'CoupledState'
    | 'StrategySpace'
    | 'Stochastic'
    | 'DiscreteEvent'
    | 'NetworkTopological'
    | 'OptimalStopping'
    | 'CombinatorialSelection';
  /** Methodology choice from BALANCING.md § Theme 3. */
  methodology: '#1' | '#2' | '#1+#2' | '#3' | '#4' | '#5' | '#6';
  /** Composition row when methodology #2 applies; null otherwise. */
  compositionRow: 'triangular' | 'piecewise' | 'modifier-product' | 'series' | 'sum' | null;
  /** Canonical-vs-invention boundary. */
  canonicalSurface: 'cited' | 'invention' | 'mixed';
  /** Tunable keys (declared-invention numbers only). Solver perturbs only these. */
  inventionKnobs: readonly string[];
}

/**
 * Per-subsystem walk for this archetype. Empty default — fill per the
 * subsystem-inventory row for your archetype. Single-subsystem archetypes
 * (producer, ambient) have one entry; multi-subsystem archetypes (scaler)
 * have one entry per bifurcating subsystem.
 */
export const ARCHETYPE_SUBSYSTEMS: readonly SubsystemMethodology[] = [
  // TODO(fill-in): one entry per subsystem from <archetype>.md / inventory.
  // {
  //   id: '<subsystem-id>',
  //   bucket: 'Pure',
  //   methodology: '#1+#2',
  //   compositionRow: 'triangular',
  //   canonicalSurface: 'invention',
  //   inventionKnobs: ['<tunable-key>', '<tunable-key>'],
  // },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function. Scores the
 * arc's flow channel (from `src/balance/flow-probe.ts`) into a single
 * number the solver can optimise against, decoupling good-feel from
 * hit-this-exact-second beat constraints.
 *
 * Player-experience-calibrated, not engine-data-driven. Tune by playtest
 * feedback, not by sim output.
 *
 * 6-band keys map directly to `flow-channel-thresholds.md § 1.2` channels.
 * BALANCING.md § Theme 1's 4-band shorthand (engaged / disengaged) is a
 * higher-level summary; the scoring surface here uses the full 6.
 */
export const FLOW_BAND_SCORE = {
  arousal: 1,
  flow: 2,
  'flow-upper': 1,
  boredom: -1,
  frustration: -3,
  breakdown: -5,
} as const;

/**
 * Pointer — the mutable scaffolding layers the solver perturbs:
 *
 *   - `../data/*.ts`            numeric constants (cost, rate, growth)
 *   - `./beats.ts`              BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                deterministic bot policy (methodology #1)
 *   - `./solve.ts`              methodology #1 bisection skeleton
 *   - `./predict.ts`            methodology #2 predictor walker (per compositionRow)
 *   - `./spec.ts`               methodology #2 engine-as-oracle helpers
 *   - `./verify.ts`             methodology #2 sim-verify driver (#1↔#2 bridge)
 *
 * Pure-#1 archetypes (ambient): predict.ts, spec.ts, verify.ts can be
 * deleted on copy. #1+#2 archetypes (producer, scaler antimatter): all
 * files used.
 */

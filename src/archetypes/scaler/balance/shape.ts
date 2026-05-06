/**
 * Scaler archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * Multi-subsystem archetype per scaler.md § 3 stress axes 1–4. Three tier-
 * scoped subsystems carry the balance shape:
 *   - antimatter (Pure / triangular): in-cycle producer + Accelerator/
 *     Multiplier ladder feeding the headline coin rate.
 *   - prestige (Optimal stopping): when-to-prestige decision against the
 *     ROI math (BALANCING.md § Theme 3 #5 / canonical existence proof).
 *   - ECC softcap (Piecewise): challenge-completion stacking under the
 *     `CalcECC` linear-then-softcap formula (Synergism Challenges.ts:541).
 *
 * Engine-as-oracle posture (`archetypes/BALANCING.md § Engine as oracle`):
 *   - Methodology #1 (`solve.ts`) — deterministic-bot-driven runs against
 *     `runUntil`; bisects single tunables per beat.
 *   - Methodology #2 (`spec.ts`/`verify.ts`) — frozen-state queries against
 *     the engine's category surface; antimatter slice is the triangular
 *     walker, prestige and ECC are deferred to sub-leaves D/E.
 *
 * Sub-leaf B installs the floor — solve + spec + verify wired against the
 * antimatter subsystem only. predict.ts and predict-bot-policy.ts are not
 * shipped here; they earn their keep at sub-leaf C/D/E triage when an
 * existing instrument can't answer a target question.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc; the archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted from scaler.md § 5. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Scaler. Forks changing any of this are no longer the
 * Scaler archetype — they've forked into a sibling or hybrid.
 */
export const SCALER_IDENTITY = {
  archetypeId: 'scaler' as const,
  /** Arc budget in sim-seconds. Scaler is a 1–2h archetype per scaler.md
   *  § 1 (thirty-minute prestige cycle near start, longer mid-game challenge
   *  runs); slim port targets the lower bound of the late-tier modifier-stack
   *  reveal. Forks compressing below ~45min or extending past ~150min are
   *  reshaping, not retuning. */
  arcBudgetSec: 90 * 60,
  /** Minimum content cardinality below which the multi-tier prestige feel
   *  collapses. Soft floor — scaffolding ships at the slim-port target. */
  minTiers: 3,
  minProducersPerTier: 5,
  minChallenges: 5,
  /** Signature climax metric. Scaler.md § 1: "watching the headline
   *  multiplier readout scroll past 1e6× → 1e120×". Slim port stops well
   *  below tetration; the 1e6× scaler-equivalent is the cross-tier modifier-
   *  chain readout from beat 8. Numeric magnitude is mutable; the metric
   *  shape (cross-tier rate-chain compounding) is the archetype centerpiece. */
  signatureMetric: 'antimatterTier.topProducer.rateChain.apply(baseRate) / baseRate',
} as const;

/**
 * Ordered player-experience phases from scaler.md § 5 density target.
 * The order and intent of each are part of the identity; the concrete
 * beat predicate and minute-window expressing each phase live in
 * `beats.ts` and are mutable.
 */
export const SCALER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-producer',
    order: 1,
    intent: 'Antimatter producer ladder seeded — first Worker buy registers',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-upgrade',
    order: 2,
    intent: 'Accelerator/Multiplier introduces the cumulative-buy modifier shape',
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-prestige',
    order: 3,
    intent: 'Coins threshold crossed — first Prestige conversion fires',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-diamond',
    order: 4,
    intent: 'Prestige tier opens — first prestigeShards + first Diamond producer',
    currentBeatId: 'beat-4',
  },
  {
    id: 'first-crystal-upgrade',
    order: 5,
    intent: 'Crystal upgrade affordable — quadratic-cost ladder reveal',
    currentBeatId: 'beat-5',
  },
  {
    id: 'first-transcend',
    order: 6,
    intent: 'First Transcend cycle + first transcend challenge attempted',
    currentBeatId: 'beat-6',
  },
  {
    id: 'first-mythos',
    order: 7,
    intent: 'Transcend tier opens — first Mythos producer + transcend-upgrade ladder',
    currentBeatId: 'beat-7',
  },
  {
    id: 'cross-tier-headline',
    order: 8,
    intent:
      'Cross-tier modifier chain readout — achievements × crystals × challenges stack visible',
    currentBeatId: 'beat-8',
  },
] as const;

/**
 * Per-subsystem methodology declaration. Multi-subsystem archetypes carve
 * the balance shape per the 9-bucket walk; each subsystem declares its
 * primary methodology and (when methodology #2 applies) its composition
 * row from `rate-function-algebra.md § 6.7`.
 *
 * Bucket vocabulary: `BALANCING.md § Theme 2` 9-bucket walk.
 * Methodology vocabulary: `BALANCING.md § Theme 3` 6-methodology kit.
 *
 * Canonical-vs-invention boundary per `BALANCING.md § Canonical numbers
 * are not tunable`: only `inventionKnobs` are solver perturbation surface.
 * Synergism-cited values (baseCosts, log bases, mythos rates, Crystal
 * baseLogCost arrays) are off-limits.
 */
export interface SubsystemMethodology {
  id: string;
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
  methodology: '#1' | '#2' | '#1+#2' | '#3' | '#4' | '#5' | '#6';
  compositionRow: 'triangular' | 'piecewise' | 'modifier-product' | 'series' | 'sum' | null;
  canonicalSurface: 'cited' | 'invention' | 'mixed';
  /** Tunable keys (declared-invention numbers only). Solver perturbs only these. */
  inventionKnobs: readonly string[];
}

export const SCALER_SUBSYSTEMS: readonly SubsystemMethodology[] = [
  {
    id: 'antimatter-producers',
    // Per scaler.md § 5: 5 cascading producers with cumulative-buy
    // Accelerator + Multiplier feeding the headline coin rate. Pure
    // closed-form per `subsystem-inventory.md § 5.3` row 12 first-half;
    // shared composition row with producer's continuous-producers
    // subsystem.
    bucket: 'Pure',
    methodology: '#1+#2',
    compositionRow: 'triangular',
    canonicalSurface: 'mixed',
    inventionKnobs: [
      // Per OL-841 body § 2: declared-invention surface only.
      'modules/antimatter/UPGRADE_PER_LEVEL_MULT/accelerator',
      'balance/achievementMultiplier',
    ],
  },
  {
    id: 'prestige-timing',
    // Per scaler.md § 5: layered Crystal-upgrade ladder paid in
    // prestigeShards post-conversion. The when-to-prestige decision is
    // policy; the per-fixed-strategy ROI closes per BALANCING.md § Theme
    // 3 #5. `subsystem-inventory.md § 5.3` row 12 second-half.
    bucket: 'OptimalStopping',
    methodology: '#5',
    compositionRow: null,
    canonicalSurface: 'mixed',
    inventionKnobs: ['modules/prestige/CRYSTAL_PER_LEVEL_BONUS'],
  },
  {
    id: 'ecc-softcap',
    // Per scaler.md § 5: 5 transcend challenges; per-completion reward
    // stacks via Synergism's `CalcECC` linear-then-softcap (`Challenges.ts
    // :541-548`). Piecewise per `BALANCING.md § Theme 2` Piecewise bucket.
    bucket: 'Piecewise',
    methodology: '#2',
    compositionRow: 'piecewise',
    canonicalSurface: 'mixed',
    inventionKnobs: [
      'modules/transcend/TRANSCEND_UPGRADE_DEFAULT_PER_LEVEL_MULT',
      'modules/transcend/UPGRADE_COST_SCALING',
      'balance/challengeCompletionMultiplier',
    ],
  },
] as const;

/**
 * Flow-band weights for the eventual arc-scoring objective function. Scores
 * the arc's flow channel into a single number the solver can optimise
 * against, decoupling good-feel from hit-this-exact-second beat constraints.
 *
 * Player-experience-calibrated, not engine-data-driven. Tune by playtest
 * feedback, not by sim output.
 *
 * 6-band keys map directly to `flow-channel-thresholds.md § 1.2` channels.
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
 *   - `../data/{antimatter,prestige,transcend,achievements}.ts`  per-tier numeric scaffolding
 *   - `../data/balance.ts`        cross-tier numeric anchors
 *   - `./beats.ts`                BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                  multi-tier policy: per-tier producers + prestige + transcend + ECC
 *   - `./solve.ts`                methodology #1 bisection skeleton (per-subsystem solvers stubbed)
 *   - `./spec.ts`                 methodology #2 engine-as-oracle helpers (antimatter slice; D/E TODO)
 *   - `./verify.ts`               methodology #2 sim-verify driver (antimatter slice; D/E TODO)
 *   - `./run.ts`                  arc + flow probe driver
 *
 * predict.ts / predict-bot-policy.ts are deferred per OL-841 body's
 * instrument-floor rule. Sub-leaves C/D/E earn them when their target
 * question can't be answered by the floor.
 */

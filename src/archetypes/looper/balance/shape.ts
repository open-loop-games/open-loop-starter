/**
 * Looper archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * Per `archetypes/BALANCING.md`:
 *   identity   (this file)            FIXED
 *   scaffolding (beats.ts, data/*.ts, bot.ts)   MUTABLE
 *   tools      (solve.ts)             search
 *   locks      (sim/*.probe.test.ts)  regressions after choices land
 *
 * Worked examples: `src/archetypes/producer/balance/`, `src/archetypes/ambient/balance/`.
 *
 * Key Looper identity points:
 *   - 2h cumulative arc — the upper bound of looper.md § 4 B8's 60–120min
 *     envelope. Continuous (single-session) per the time-loop subgenre.
 *   - Signature climax is multi-axis compounding becoming visible: cross-loop
 *     Talent multiplier, persistent manapot-pool extension via progressVars,
 *     and spatial expansion through prereq-gated zone-2 content.
 *   - Mana = ticks (250-tick `initialMana` baseline at engine 20 TPS gives a
 *     ~12.5 sim-second fresh first loop). Cross-loop axes (Talent + manapot
 *     pool) extend the per-loop budget; mana itself does NOT compound.
 *   - 8 beats — the first three (action ticking, first loop ends, first
 *     persistent-progress tick) live inside the first 2 minutes; beats 6 + 7
 *     cluster in the 25–60 min mid-late zone; B8 is the 60–120min closure.
 *   - Tier-A — clears all four BALANCING.md § Tier-decision questions (single
 *     fire-time per beat, 1-D scalar bisection, deterministic bot under fixed
 *     phase weights, no adversary).
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted verbatim from
   *  `archetypes/looper.md` § 4. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a
   *  phase may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Looper. Forks changing any of this are no longer the
 * Looper archetype — they've forked into a sibling or hybrid.
 */
export const LOOPER_IDENTITY = {
  archetypeId: 'looper' as const,
  /** 2 sim-hours, continuous. Upper bound of looper.md § 4 B8's 60–120min
   *  envelope; forks compressing below ~45min or extending past ~3h are
   *  reshaping, not retuning (per § 4 lead-in). */
  arcBudgetSec: 2 * 60 * 60,
  /**
   * Minimum content cardinality the canonical Looper shape depends on. Soft
   * floors — scaffolding ships with 4 capabilities, 2 zones, 4 progressVars,
   * ≥5 regularVars, ~15 actions across all three type variants and all five
   * ActionPrereq variants. Already encoded as math-only locks in
   * `sim/balance.probe.test.ts`; mirrored here so shape.ts is self-describing.
   */
  minCapabilities: 4,
  minZones: 2,
  minProgressVars: 4,
  minRegularVars: 5,
  /**
   * Signature climax metric — the B8 conjunction from looper.md § 4. Numeric
   * thresholds (loop-count, talent-mult, second-zone reached) are mutable;
   * the conjunction shape (cross-loop compounding × manapot extension ×
   * spatial expansion all visible at once) is the archetype centerpiece.
   */
  signatureMetric:
    'loop.count >= 5 AND avgTalentMult > 1.05 AND second zone reached (any wilds-zone action completed)',
} as const;

/**
 * Ordered player-experience phases, from `looper.md` § 4. The order and
 * intent of each are part of the identity; the concrete beat predicate and
 * minute-window expressing each phase live in `beats.ts` and are mutable.
 *
 * Beats 6 + 7 cluster — talent-perceptibility (Talent → faster Level → cost
 * reduction) and zone-2 visibility share the 25–60 min zone, ordering by
 * player plan focus (talent-grinder hits 6 first; explore-grinder hits 7
 * first). The canonical sequence puts Talent first; beats.ts's solver
 * absorbs the cluster slack at tuning time.
 */
export const LOOPER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-action-ticking',
    order: 1,
    intent: 'First action ticking, mana visibly draining',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-loop-ends',
    order: 2,
    intent: 'First loop ends',
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-persistent-progress-tick',
    order: 3,
    intent: 'First persistent-progress tick',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-manapot-harvest',
    order: 4,
    intent: 'First manapot harvest',
    currentBeatId: 'beat-4',
  },
  {
    id: 'first-gold-mana-exchange',
    order: 5,
    intent: 'First gold→mana exchange used',
    currentBeatId: 'beat-5',
  },
  {
    id: 'first-talent-multiplier-perceptible',
    order: 6,
    intent: 'First Talent multiplier perceptible',
    currentBeatId: 'beat-6',
  },
  {
    id: 'second-zone-content-visible',
    order: 7,
    intent: 'Second zone content visible',
    currentBeatId: 'beat-7',
  },
  {
    id: 'arc-closure-multi-axis-compounding',
    order: 8,
    intent: 'Arc closure: multi-axis compounding visible',
    currentBeatId: 'beat-8',
  },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function. Player-
 * experience-calibrated, not engine-data-driven. Tune by playtest feedback,
 * not by sim output.
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
 *   - `../data/balance.ts`         initialMana, costDivisor, talentAccrualRatio
 *   - `../data/actions.ts`         per-action manaCost, expMult, weights, prereqs
 *   - `../data/progress-vars.ts`   per-progressVar expMult, scales[].perLevel
 *   - `../data/regular-vars.ts`    per-regularVar pool shape
 *   - `./beats.ts`                 BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                   phase-conditioned sim-bot (leaf 3)
 *
 * All subject to co-reshape when a phase from `LOOPER_PHASES` can't be
 * expressed under the current scaffolding (per BALANCING.md § Retune vs
 * reshape).
 */

/**
 * Defender balance — identity layer + beat windows + predicates.
 *
 * Discrete-event, single-player archetype with placement decision-density.
 * Signature is round-clear survival across a fixed wave schedule (verbatim
 * from `BloonsTD.as:574+ BuildLevels()`); methodology fit per
 * `BALANCING.md § Bucket → methodology lookup`:
 *
 *   - **Cost scaling (purchase economy):** Pure closed-form. Linear per-tower
 *     cost (no per-unit growth in arc 1). Methodology #1 — spec the
 *     "minimum cash-flow to clear round N" curve, calibrate against
 *     `runUntil`, lock with regression bounds.
 *   - **Wave pacing (the schedule itself):** Fixed scaffolding — verbatim
 *     BTD1 with `BloonsTD.as:574+` citations. NOT perturbable per Phase 1
 *     triage. No methodology applies; this is *content*.
 *   - **Tower DPS coverage (placement + targeting):** Discrete-event
 *     coupled (`BALANCING.md § The nine-bucket walk`). Multiple in-flight
 *     bloons + multiple towers ticking simultaneously + sequencer-driven
 *     wave spawns + AoE timing interactions = combinatorial state space.
 *     Methodology #6 (pure sim discovery) as the bucket fit; the bucket-walk
 *     row recommends sim-discovery against a chosen distribution statistic
 *     (e.g., `survivalRate(round) = P(round-clear | placement strategy)`).
 *   - **Threat-range coverage (range × path × placement):** Sensitivity to
 *     a single design knob (range scale). Methodology #3 — sweep
 *     `towers/<id>/rangeLaneUnits` against round-clear time and report the
 *     response curve, propose elbow scalar where survivability stabilizes.
 *
 * Defender does NOT use closed-form rate algebra (no continuous income
 * channel — see § Stasis bifurcation in `BALANCING-defender.md`). The math
 * lives in the methodology #3 sweep response curve and the methodology #6
 * survival-rate distribution.
 *
 * Predictor-seed shape: NO. Defender's arc closes on a discrete
 * round-counter event, not a closed-form fire-time prediction; the
 * methodology kit doesn't earn a `shape.ts` / `spec.ts` split here.
 * Identity + windows fit in this single file.
 */

import { type BeatProbe, type Engine } from '@open-loop/engine';
import { BloonsKey, RoundKey, TowersKey } from '../modules';

// ─── Identity ────────────────────────────────────────────────────────────

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Beat id below currently expressing this phase. Mutable — a phase may
   *  migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Defender. Forks changing any of this are no longer the
 * Defender archetype — they've forked into a sibling (Defender-Packer
 * hybrid, etc.).
 */
export const DEFENDER_IDENTITY = {
  archetypeId: 'defender' as const,
  /** ~40 min cumulative arc — 10 rounds × ~30-90s per round + tower-buying
   *  gaps. Phase 5b sim discovery will tighten this once the balance pass
   *  measures actual round durations under the verbatim BTD1 numbers +
   *  pixel-space playfield. Initial estimate; not the methodology-target
   *  binding number. */
  arcBudgetSec: 40 * 60,
  /** Min content cardinality the targeting pattern depends on. 4 towers
   *  (dart / tack / bomb / ice) is the minimum that supports the
   *  cluster-by-effect-shape Defender pattern (single-target / radial /
   *  splash / debuff). Skeleton ships exactly 4. */
  minTowerArchetypes: 4,
  /** Bloon shedding ladder depth. 4 ranks (red / blue / green / yellow)
   *  in arc 1; ranks 5+ (pink / black / etc.) deferred to expansion. */
  minBloonRanks: 4,
  /** Path length in BTD1 pixels. Computed from the plain1-extracted
   *  waypoints in `data/path.ts` (19 waypoints decimated from 915 frames
   *  via Douglas-Peucker at eps=10px). Total 2137 px ≈ 23.2s red-bloon
   *  transit at the verbatim BTD1 red speed of ~93 px/s. Cached here for
   *  sim probes needing the constant without injecting the map module. */
  pathTotalLaneUnits: 2137,
  /** Signature climax metric. Numeric magnitudes are mutable; the metric
   *  *shape* — `survivalRate(round N | placement strategy)` distribution
   *  across N seeds, plus per-round mean leak count — is the archetype
   *  centerpiece. Methodology #6 (pure sim discovery) target. */
  signatureMetric:
    'arc-1 survival rate — fraction of seeded runs that clear round 10 without lives reaching 0, plus mean leaked-bloon count per round (rounds 1–10) across N=20 seeds with a fixed bot placement policy',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete beat predicate and time-window expressing
 * each phase live in `ARC_BEATS` / `BEAT_WINDOWS` below and are mutable.
 *
 * Phase progression mirrors the manifest's beat sequence:
 *  1. First placement (mechanic introduced)
 *  2. First round survived (economy loop closes)
 *  3. Second tower type bought (build-out begins; cash-spend has a choice)
 *  4. First shedding-bloon popped (ladder mechanic introduced)
 *  5. First non-red-shed wave cleared (rank-3 bloons in play)
 *  6. Arc closure (victory OR defeat)
 */
export const DEFENDER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-tower-placed',
    order: 1,
    intent:
      'First tower placed — placement mechanic concrete; the cash → tower → coverage loop is visible',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-round-cleared',
    order: 2,
    intent:
      'Round 1 cleared (12 reds defeated) — economy loop closes; per-pop grants accumulate to a round-clear bonus and the round advances',
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-second-type-bought',
    order: 3,
    intent:
      'First non-dart tower bought (tack / bomb / ice) — build-out begins; the cash-spend decision has a meaningful branching point',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-shed-observed',
    order: 4,
    intent:
      'First blue-shed observed (round 3 onward) — shedding ladder introduces the rank-N → rank-N-1 mechanic; pop pressure doubles',
    currentBeatId: 'beat-4',
  },
  {
    id: 'first-green-wave-cleared',
    order: 5,
    intent:
      'Round 6 cleared — 10 greens, first non-red-shed wave; tests whether the placement supports rank-3 pressure (greens shed into blues which shed into reds)',
    currentBeatId: 'beat-5',
  },
  {
    id: 'arc-closure',
    order: 6,
    intent:
      'Arc closure — round 10 cleared (victory) OR defeat at round 7+ (the lives-decrement curve under-water past the 6-round midpoint)',
    currentBeatId: 'beat-6',
  },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function.
 *
 * **N/A for Defender.** Flow-band scoring measures pacing across a
 * continuous-rate arc — how much of the player's sim-time is spent in
 * flow vs boredom vs frustration. Defender's arc is round-paced:
 *  - During a round, the player has zero agency (towers fire on their
 *    own cooldowns; the player can only watch). Pacing is engine-driven.
 *  - Between rounds, the player has spike-decision agency (buy / sell /
 *    reposition / press start). Pacing is player-driven, but it's a
 *    spike, not a continuous-time band.
 *
 * The right pacing metric is *round-duration distribution* (methodology
 * #6 in `probes.ts` post-Phase-5b), not a flow-band time-share.
 *
 * If a future Defender fork adds continuous-time agency mid-round (e.g.,
 * an upgrade-mid-wave knob), revisit. Not relevant for arc 1.
 */
export const FLOW_BAND_SCORE: null = null;

// ─── Windows + beat predicates ───────────────────────────────────────────

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * Phase windows in seconds. Same windows the `manifest.ts` `beats` table
 * declares — restated here as the source-of-truth for math-only `runUntil`
 * fire-time bisection and MC distribution-statistic probes' aggregate
 * windows when Phase 5b lands those probes.
 *
 * Windows are an estimate informed by Phase 4 manual playthrough + the
 * pixel-space coordinate system (red bloon at 30 px/s on a 2250-px path →
 * ~75s traversal; rounds 1–2 short, rounds 6–10 longer with tower
 * cooldowns finishing waves). Expect 5–20% shifts during 5b reconciliation
 * — and possibly a path-length or `cellSizePixels` re-author once the sim
 * measures actual round durations against BTD1's known ~25–30s red transit.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)],
  'beat-2': [sec(30), sec(90)],
  'beat-3': [sec(90), min(5)],
  'beat-4': [min(3), min(7)],
  'beat-5': [min(10), min(20)],
  'beat-6': [min(20), min(40)],
};

/**
 * Predicates for arc-probe + math-only beat-time bisection.
 *
 * - 1 (math-only): first tower placed — `towers.placedCount() >= 1`. Fires
 *   the tick the bot's first `placeTower()` call commits.
 * - 2 (math-only): round 1 cleared — `round.currentRound.value >= 2`. The
 *   round-counter advances inside the bloons module's `wave-cleared`
 *   handler.
 * - 3 (math-only): first non-dart tower bought —
 *   `towers.placedCountOf('tack') + placedCountOf('bomb') +
 *    placedCountOf('ice') >= 1`.
 * - 4 (instrumentation-deferred): first blue-shed observed. Predicate is a
 *   PLACEHOLDER until Phase 5b authors `balance/bot.ts` with a
 *   `onBloonPopped` subscriber that increments a shedding-event counter
 *   the bot exposes via injection. Today it returns false — the bot
 *   layer doesn't exist yet to wire the subscription.
 * - 5 (math-only): round 6 cleared — `round.currentRound.value >= 7`.
 * - 6 (math-only): arc closure — `round.outcome.value !== 'in-progress'`.
 *   Fires on first `'victory'` or `'defeat'` flip.
 *
 * Fire-time predicates are evaluated once per tick before each
 * `simulateTick` (per `runUntil` semantics).
 */
export const ARC_BEATS: BeatProbe[] = [
  {
    id: 'beat-1',
    tuningWindow: BEAT_WINDOWS['beat-1']!,
    predicate: (engine) => towersPlacedAtLeast(engine, 1),
  },
  {
    id: 'beat-2',
    tuningWindow: BEAT_WINDOWS['beat-2']!,
    predicate: (engine) => roundAtLeast(engine, 2),
  },
  {
    id: 'beat-3',
    tuningWindow: BEAT_WINDOWS['beat-3']!,
    predicate: (engine) => nonDartTowerBought(engine),
  },
  {
    id: 'beat-4',
    tuningWindow: BEAT_WINDOWS['beat-4']!,
    // Phase 5a placeholder. Phase 5b wires a bot-side shed-event counter
    // via `bloons.onBloonPopped(({ defId }) => ...)`; this predicate then
    // reads that counter through an injection key the bot module provides.
    predicate: () => false,
  },
  {
    id: 'beat-5',
    tuningWindow: BEAT_WINDOWS['beat-5']!,
    predicate: (engine) => roundAtLeast(engine, 7),
  },
  {
    id: 'beat-6',
    tuningWindow: BEAT_WINDOWS['beat-6']!,
    predicate: (engine) => arcClosed(engine),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function towersPlacedAtLeast(engine: Engine, n: number): boolean {
  const towers = engine.tryInject(TowersKey);
  return towers ? towers.placedCount() >= n : false;
}

function roundAtLeast(engine: Engine, n: number): boolean {
  const round = engine.tryInject(RoundKey);
  return round ? round.currentRound.value >= n : false;
}

function nonDartTowerBought(engine: Engine): boolean {
  const towers = engine.tryInject(TowersKey);
  if (!towers) return false;
  return (
    towers.placedCountOf('tack') + towers.placedCountOf('bomb') + towers.placedCountOf('ice') >= 1
  );
}

function arcClosed(engine: Engine): boolean {
  const round = engine.tryInject(RoundKey);
  if (!round) return false;
  return round.outcome.value !== 'in-progress';
}

// Re-export for symmetry with sibling archetypes (producer / ambient
// expose ARC_BEATS, BEAT_WINDOWS, and identity at the same surface).
export { BloonsKey, RoundKey, TowersKey };

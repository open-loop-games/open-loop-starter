/**
 * Ambient archetype — declarative balance surface.
 *
 * Two halves, one file:
 *   ── Identity ── (fixed)   AMBIENT_IDENTITY + AMBIENT_PHASES + FLOW_BAND_SCORE
 *   ── Beats ──   (mutable)  BEAT_WINDOWS + FLOW_BEATS + ARC_BEATS predicates
 *
 * Identity names what changing the constants can't change about Ambient.
 * Beats are the mutable scaffolding the solver perturbs against; each beat
 * predicate is paired with a `currentBeatId` on the matching phase.
 *
 * Algorithmic surfaces live alongside:
 *   bot.ts    — sim-engine builder (`buildAmbientSimEngine`)
 *   solve.ts  — vite-node bisection solver
 *   probes.ts — offline-round-trip + no-pressure invariant probes
 *
 * Worked example for cross-reference: `src/archetypes/producer/balance/`.
 */

import { Decimal } from '@open-loop/engine';
import { getAchievements, getAutoProducers, getPrimaryResource, getUnlocks } from '../modules';
import type { BeatProbe, Waypoint } from '@/balance';

// ─── Identity ─────────────────────────────────────────────────────────────

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
 * Ambient identity points (vs Producer):
 *   - Arc is multi-hour cumulative — not continuous. Sessions in reality are
 *     distributed; the beat map measures accumulated sim-time regardless of
 *     wall-clock distribution. For headless sim, wall-clock = sim-clock.
 *   - Signature climax is mid-arc scene diversification — visual depth
 *     without engagement demand (Rusty's-Retirement / Chillquarium /
 *     Tiny-Pasture identity).
 *   - Zero-click contract — auto-production runs without input. Manual
 *     clicking is a bonus, not a requirement.
 *
 * Forks changing any of this are no longer the Ambient archetype — they've
 * forked into a sibling or hybrid.
 */
export const AMBIENT_IDENTITY = {
  archetypeId: 'ambient' as const,
  /** Cumulative sim-time budget for the headless beat span. Matches
   *  `OFFLINE_CAP_HOURS = 12` in `modules/session-clock.ts` so a single
   *  overnight session can land the full beat span. */
  arcBudgetSec: 12 * 60 * 60,
  /** Minimum content cardinality the mid-arc beats lean on. Soft floor —
   *  scaffolding ships with 5 producers + 12 unlocks + 6 scene variants
   *  + 20 achievements. */
  minAutoProducers: 3,
  minSceneVariants: 3,
  /**
   * Signature climax metric. Numeric magnitudes are mutable; the metric
   * shape (mid-arc scene-variant unlocked alongside a mid-tier producer
   * owned) is the archetype centerpiece per AMBIENT_PHASES § beat-5.
   */
  signatureMetric: 'midSceneUnlock.active AND midProducerOwned',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete beat predicate and minute-window expressing
 * each phase live in the Beats section below and are mutable.
 */
export const AMBIENT_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-passive-production',
    order: 1,
    intent: 'First passive production visible — confirms the game produces *without* the player',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-auto-producer-purchased',
    order: 2,
    intent: 'First auto-producer purchased (T1) — validates cost onboarding',
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-visibility-unlock',
    order: 3,
    intent: 'First visibility unlock revealed — gentle unfold cadence established',
    currentBeatId: 'beat-3',
  },
  {
    id: 'glance-check-payoff',
    order: 4,
    intent:
      'Glance-check value proposition proven — first time the player leaves and returns rewarded',
    // Resume-driven. Not testable in continuous headless sim; verified at
    // runtime via sessionClock.lastResumeGapSec. No solver target.
    currentBeatId: null,
  },
  {
    id: 'mid-arc-scene-diversification',
    order: 5,
    intent: 'Mid-arc scene diversification — visual depth without engagement demand',
    currentBeatId: 'beat-5',
  },
  {
    id: 'first-low-urgency-achievement',
    order: 6,
    intent: 'First low-urgency achievement multiplier — pacing markers, not pressure',
    currentBeatId: 'beat-6',
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

// ─── Beats ────────────────────────────────────────────────────────────────

const sec = (s: number) => s;
const min = (m: number) => m * 60;
const hr = (h: number) => h * 60 * 60;

/**
 * Beat windows in seconds, against the 12h-cumulative arc. One source of
 * truth for both flow-probe snapshot midpoints and arc-probe spec windows;
 * AMBIENT_PHASES above holds the player-experience intents these predicates
 * express.
 *
 * Beat 4 ("glance-check value proposition proven") is resume-driven and
 * not testable in continuous headless sim. It's omitted from BEAT_WINDOWS
 * intentionally — runtime verification lives in AppRoot's resume sequence
 * (sessionClock.lastResumeGapSec writes drive the welcome-back overlay),
 * not the solver. See AMBIENT_PHASES — beat-4's currentBeatId is null for
 * the same reason.
 *
 * Windows are an LLM guess on first pass — fully expect to shift them
 * during balance reconciliation (BALANCING.md § "Retune vs reshape" →
 * "move the phase"). Producer's B5/B6/B7 shifted 15–25 minutes during
 * prior tuning; record the same kind of shifts here in commit notes if
 * they happen.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)],
  'beat-2': [min(1), min(3)],
  'beat-3': [min(30), hr(1) + min(30)],
  'beat-5': [hr(3), hr(5)],
  'beat-6': [hr(5), hr(8)],
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Snapshot points for the flow-probe — taken at each beat's window
 * midpoint so per-producer pacing reflects the player's likely state
 * during that beat, not its earliest or latest moment.
 */
export const FLOW_BEATS: Waypoint[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
}));

/**
 * Arc-probe predicates, decoded for the headless bot (zero-click,
 * auto-purchase producers + unlocks + scene-variants):
 *
 * - 1: `primary >= 1` ("first passive production visible"). The planter
 *   seeds at initialAmount: 1, so primary crosses 1 in seconds —
 *   verify-only beat under default content.
 * - 2: planter count ≥ 2 — first *purchased* auto-producer (planter starts
 *   at count 1 from initialAmount). Under zero-click the planter is the
 *   only T1, and the first cost paid is the second planter unit.
 * - 3: first non-default-visible unlock fires — the `coop-built` unlock by
 *   default content (smallest threshold > 0 among non-default unlocks).
 *   Reads via `unlocks.getPurchasable('coop-built').active.value`.
 * - 5: mid producer owned AND first scene-variant unlocked — pond is the
 *   middle tier (index 2 of 5); spring-arrives is the first scene-variant
 *   unlock by threshold. Conjunction expresses "mid-arc scene
 *   diversification" — visual depth without engagement demand.
 * - 6: ≥ 8 achievements earned — 1.02⁸ ≈ 1.17× is the "first felt
 *   multiplier" threshold (Producer's beat-5 used a similar count threshold).
 *   Headless bot can fire 12 of 20 achievements (10 milestone
 *   + 2 tick-time); 8 sits comfortably in the reachable middle.
 *
 * Beat 4 is resume-driven, not bisected — verify-only at runtime.
 */
export const ARC_BEATS: BeatProbe[] = [
  {
    id: 'beat-1',
    targetWindow: BEAT_WINDOWS['beat-1']!,
    predicate: () => Decimal.gte(getPrimaryResource().value, 1),
  },
  {
    id: 'beat-2',
    targetWindow: BEAT_WINDOWS['beat-2']!,
    predicate: () => producerCountAtLeast('planter', 2),
  },
  {
    id: 'beat-3',
    targetWindow: BEAT_WINDOWS['beat-3']!,
    predicate: () => unlockBought('coop-built'),
  },
  {
    id: 'beat-5',
    targetWindow: BEAT_WINDOWS['beat-5']!,
    predicate: () => producerCountAtLeast('pond', 1) && unlockBought('spring-arrives'),
  },
  {
    id: 'beat-6',
    targetWindow: BEAT_WINDOWS['beat-6']!,
    predicate: () => achievementsEarnedAtLeast(8),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function producerCountAtLeast(id: string, n: number): boolean {
  const p = getAutoProducers().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function unlockBought(id: string): boolean {
  return getUnlocks().getPurchasable(id)?.active.value ?? false;
}

function achievementsEarnedAtLeast(n: number): boolean {
  return getAchievements().earnedCount.value >= n;
}

export { producerCountAtLeast, unlockBought, achievementsEarnedAtLeast };

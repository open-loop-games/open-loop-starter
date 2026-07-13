/**
 * Producer beat spec — the Lane-3 lock's measured windows + predicates.
 *
 * The mutable half of the old `balance.ts`: per-beat sim-second windows
 * (`BEAT_WINDOWS`), the arc-probe predicates (`ARC_BEATS`), and the flow-probe
 * snapshot midpoints (`FLOW_BEATS`). The *identity* half (what's FIXED about
 * Producer — phases, subsystem methodology) dissolved into `../IDENTITY.md`; the
 * closed-form cost/rate lens lives in the `// ─── Balance ───` sections of
 * `../data/*.ts`. See `../../README.md` § Balance — three lanes.
 *
 * The Lane-3 lock (`../sim/producer.probe.test.ts`) owns these as its
 * measure-and-record windows; the Lane-2 probes (`solve-probe.ts` /
 * `arc-probe.ts` / `predict-probe.ts`) import them too. When a phase is
 * unreachable, the response is to propose coherent shifts across scaffolding —
 * move the beat, reshape content, relax the target — not to contort one constant
 * until the math closes.
 */

import { Decimal, type DecimalSource } from '@open-loop/engine';
import { getAchievements, getBuildings, getPrimaryResource, getUpgrades } from '../modules';
import type { BeatProbe, Waypoint } from '@/balance';

// ─── Windows ──────────────────────────────────────────────────────────────

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * Beat windows in seconds. One source of truth for both the flow-probe
 * snapshot midpoints and the arc-probe spec windows.
 *
 * The arc is a "watch cookies-per-second scroll through powers of ten" ladder
 * — Cookie Clicker's core experience and this archetype's identity line. Beats
 * 1–3 mark the opening structural moves (first cookie, first producer, first
 * grandma); beats 4–7 are CpS crossing 1e3 → 1e6, the compound climb the
 * headline signature is about. Every beat is monotonic (counts never fall, CpS
 * only grows), so the arc locks cleanly with no oscillation.
 *
 * Windows are bands around the measured firing times of the default Bakery
 * content set driven by the balance bot (human-then-autoclicker click model +
 * pooling producer reserve + greedy upgrade sweep + the global-multiplier
 * chain). Re-derive with `balance/arc-probe.ts` after any content or bot-model
 * change; forks with a different content set will re-measure their own bands.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)],
  'beat-2': [sec(5), min(1.5)],
  'beat-3': [sec(20), min(3)],
  'beat-4': [min(7), min(20)],
  'beat-5': [min(20), min(38)],
  'beat-6': [min(35), min(55)],
  'beat-7': [min(52), min(80)],
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Snapshot points for the flow-probe — taken at each beat's window
 * midpoint so the per-producer pacing reflects the player's likely
 * state during that beat, not at its earliest or latest possible moment.
 */
export const FLOW_BEATS: Waypoint[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
}));

/**
 * Predicates for arc-probe. The arc is a CpS power-of-ten ladder; trigger
 * decoding:
 *
 * - 1: primary resource ≥ 1 (first cookie registers).
 * - 2: cursor (tier 1) owned — first producer, automation begins.
 * - 3: grandma (tier 2) owned — the economy diversifies past the cursor.
 * - 4: total CpS ≥ 1e3 — production is humming; the opening flurry of tier
 *   upgrades has stacked and the first global-multiplier rung is near.
 * - 5: total CpS ≥ 1e4 — mid-arc; the global-multiplier chain has begun
 *   compounding across every producer.
 * - 6: total CpS ≥ 1e5 — the bulk-buy rhythm and deepening tier ladders push
 *   the headline into six figures.
 * - 7: total CpS ≥ 1e6 — the compound climax. Cookies-per-second scrolls past
 *   a million, the archetype-signature "watch the number scroll" payoff.
 *
 * Beats 4–7 read total production rate (`getBuildings().getTotalRate`), which
 * is the global headline: every producer's base × count folded through its
 * rate chain (tier upgrades × milestone bonus × achievement + global-mult
 * chain). It is monotonic, so each beat fires once and never un-fires.
 */
export const ARC_BEATS: BeatProbe[] = [
  {
    id: 'beat-1',
    tuningWindow: BEAT_WINDOWS['beat-1']!,
    predicate: () => Decimal.gte(getPrimaryResource().value, 1),
  },
  {
    id: 'beat-2',
    tuningWindow: BEAT_WINDOWS['beat-2']!,
    predicate: () => producerCountAtLeast('cursor', 1),
  },
  {
    id: 'beat-3',
    tuningWindow: BEAT_WINDOWS['beat-3']!,
    predicate: () => producerCountAtLeast('grandma', 1),
  },
  {
    id: 'beat-4',
    tuningWindow: BEAT_WINDOWS['beat-4']!,
    predicate: () => headlineCpsAtLeast(1e3),
  },
  {
    id: 'beat-5',
    tuningWindow: BEAT_WINDOWS['beat-5']!,
    predicate: () => headlineCpsAtLeast(1e4),
  },
  {
    id: 'beat-6',
    tuningWindow: BEAT_WINDOWS['beat-6']!,
    predicate: () => headlineCpsAtLeast(1e5),
  },
  {
    id: 'beat-7',
    tuningWindow: BEAT_WINDOWS['beat-7']!,
    predicate: () => headlineCpsAtLeast(1e6),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function producerCountAtLeast(id: string, n: number): boolean {
  const p = getBuildings().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function upgradeBought(id: string): boolean {
  return getUpgrades().getPurchasable(id)?.active.value ?? false;
}

function achievementsEarnedAtLeast(n: number): boolean {
  return getAchievements().earnedCount.value >= n;
}

/**
 * True when total production rate (the global headline CpS) is ≥ `rate`. This
 * is the whole economy's cookies-per-second — every continuous producer's base
 * × count folded through its rate chain — so it captures the global-multiplier
 * chain and every per-producer stack at once. Monotonic across the arc.
 */
function headlineCpsAtLeast(rate: DecimalSource): boolean {
  return Decimal.gte(getBuildings().getTotalRate(getPrimaryResource()), rate);
}

// Re-export for callers that pin beat magnitudes directly (e.g. the Lane-3
// regression lock reading the headline CpS at a chosen beat).
export { headlineCpsAtLeast, achievementsEarnedAtLeast, producerCountAtLeast, upgradeBought };

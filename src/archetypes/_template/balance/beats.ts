/**
 * <Archetype> beat map — predicates + windows.
 *
 * Scaffold. Each entry in `ARC_BEATS` maps one phase from `shape.ts` to a
 * testable predicate and a minute-window the solver can tune against.
 * Predicates are called every tick of the arc probe — keep them
 * state-readable, not computation-heavy.
 *
 * Worked example: `src/archetypes/producer/balance/beats.ts`.
 */

import { type Engine } from 'open-loop-engine';
import type { ArcBeatProbe, BeatProbe } from '@/balance';

// TODO(fill-in): import archetype-specific injection keys from its
// modules. Example from producer:
//   import { PrimaryResourceKey, BuildingsKey, ... } from '../modules';

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * § 4 windows in seconds. One source of truth for both flow-probe snapshot
 * midpoints and arc-probe spec windows.
 *
 * Windows are an LLM guess on first pass — fully expect to shift them
 * during the first balance reconciliation (see `BALANCING.md` § Retune vs
 * reshape → "move the phase"). Producer's B5/B6/B7 shifted by 15–25
 * minutes during OL-625 to match natural firing density.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  // TODO(fill-in): one entry per beat from <archetype>.md § 4.
  // 'beat-1': [sec(0), sec(30)],
  // 'beat-2': [min(1), min(3)],
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Flow-probe snapshot points — window midpoints so per-producer (or
 * per-archetype-equivalent) pacing reflects likely state during that beat,
 * not its earliest or latest moment.
 */
export const FLOW_BEATS: BeatProbe[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
}));

/**
 * Arc-probe beat table. One entry per phase from `shape.ts`. The predicate
 * is how "this phase has fired" is operationalized — mutable, co-moves with
 * the predicate-helpers block below.
 *
 * Anti-pattern warning: predicates that require hoarding/stalling to test
 * (e.g. "can afford `getCost(10)`" without actually buying) force the bot
 * into unnatural behavior and warp the fire time. Prefer state-based
 * predicates ("count ≥ N", "any X ≥ threshold"). See producer's
 * `anyContinuousProducerAtLeast` for a state-based reshape (OL-625) that
 * replaced a hoard-gated predicate.
 */
export const ARC_BEATS: ArcBeatProbe[] = [
  // TODO(fill-in):
  // {
  //   id: 'beat-1',
  //   specWindow: BEAT_WINDOWS['beat-1']!,
  //   predicate: (engine: Engine) => /* state check */,
  // },
];

// ─── Predicate helpers ──────────────────────────────────────────────────
//
// Extract reusable predicate helpers here — archetype-scoped. Don't extract
// to `src/balance/` until a second archetype hand-rolls the same shape
// (drop `TODO(expansion)` at both sites first; promote when the N=2
// convergence signal lands per engine candidate-primitives convention).

// TODO(fill-in): predicate helpers against your archetype's injection keys.
void (null as unknown as Engine); // import used once helpers exist

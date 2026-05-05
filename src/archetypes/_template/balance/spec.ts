/**
 * <Archetype> engine-as-oracle helpers — methodology #2 spec layer.
 *
 * Helpers for querying the engine at frozen state. Build the engine once
 * (no bot, no ticks running), mutate persistent refs into hypothetical
 * states, and read `getCost(1)` / `getTotalRate` / modifier-chain readouts.
 * The walker (`predict.ts`) calls these to assemble per-step Δt values.
 *
 * Per `archetypes/BALANCING.md § Engine as oracle`. For methodology-#1-only
 * archetypes: delete this file on copy.
 *
 * Worked example: `src/archetypes/producer/balance/spec.ts`. Producer's
 * triangular walker (`arcWaypoints`) is the lifted reference — strict-
 * tier-order schedule, per-step Δt = `getCost(1) / getTotalRate` at frozen
 * state, Σ-of-first-passages cumulative per algebra § 6.3 / § 6.6.
 */

import { type Engine } from 'open-loop-engine';

// TODO(fill-in): import your archetype's createEngine factory.
//   import { create<Archetype>Engine } from '..';

const counter = 0;
let cachedEngine: Engine | undefined;

/**
 * Build a frozen-state engine for prediction queries.
 *
 * No bot module installed; engine is `start()`ed + immediately `stop()`ped
 * to suppress the real-time interval, leaving callers free to mutate
 * persistent refs and read costs/rates without ticks firing.
 */
export function getSpecEngine(): Engine {
  if (cachedEngine) return cachedEngine;
  cachedEngine = createSpecEngine();
  return cachedEngine;
}

function createSpecEngine(): Engine {
  // TODO(fill-in):
  //   const { engine } = create<Archetype>Engine(undefined, {
  //     persistenceNamespace: `spec-${++counter}`,
  //   });
  //   engine.start();
  //   engine.stop();
  //   return engine;
  void counter;
  throw new Error('template — replace with archetype-specific spec-engine boot');
}

// ─── Schedule walker types ───────────────────────────────────────────────
//
// Schedule = ordered list of state mutations. Each step is one mutation
// (count change, upgrade activation, etc.); the walker accumulates per-step
// Δt = cost / rate at the post-mutation state.
//
// Producer's reference (triangular row):
//   - TierStep { kind: 'tier', id, to } — grow continuous producer count
//   - UpgradeStep { kind: 'upgrade', id } — activate upgrade
//
// Other rows define their own step shape (piecewise: regime-bound steps;
// modifier-product: no schedule, single rescale).

/**
 * One waypoint per schedule step (no-ops included). `atSec` is cumulative
 * time at the moment the step's effect lands.
 */
export interface ArcWaypoint {
  step: ScheduleStep;
  atSec: number;
  state?: Readonly<Record<string, unknown>>;
}

// TODO(fill-in): define ScheduleStep per your archetype's composition row.
// For triangular, see producer's TierStep | UpgradeStep union.
export type ScheduleStep = {
  kind: string;
  [key: string]: unknown;
};

/**
 * Walk a schedule against the frozen-state engine; return per-step waypoints.
 *
 * Triangular row reference (`producer/balance/spec.ts`): for each step,
 * mutate the engine's persistent refs (counts, upgrade `amount`), query
 * `repeatable.getCost(1)` and `getTotalRate` at the new state, accumulate
 * `Δt = cost / rate`. See producer's `setCounts` / `resetUpgrades` for the
 * mutation pattern.
 */
export function arcWaypoints(
  schedule: readonly ScheduleStep[],
  _initial: Readonly<Record<string, number>> = {},
): ArcWaypoint[] {
  // TODO(fill-in): implement per your composition row.
  void schedule;
  throw new Error('template — replace with archetype-specific schedule walker');
}

/**
 * Total schedule time. Convenience wrapper over `arcWaypoints`.
 */
export function arcTimeUnderSchedule(
  schedule: readonly ScheduleStep[],
  initial: Readonly<Record<string, number>> = {},
): number {
  const wps = arcWaypoints(schedule, initial);
  return wps.length === 0 ? 0 : wps[wps.length - 1]!.atSec;
}

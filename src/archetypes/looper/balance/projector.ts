/**
 * Looper closed-form beat-fire-time projector — math-first balance companion.
 *
 * Predicts when a beat fires from the planner's static-cost view of the arc,
 * with no engine forward-sim. Pairs with the sim oracle for verification:
 * solver searches the projector's surface (fast), sim confirms the chosen
 * knob set lands beats inside their windows (truth).
 *
 * # Why static-cost first
 *
 * Planner is Option A (static cost): `adjustedTicks` is read once at
 * plan-build and applied uniformly across all loops of an action. The sim
 * uses live cost (drops as capability XP accrues mid-loop). A delta between
 * projector and sim is therefore EXPECTED — it measures the cost-reduction-
 * during-loop physics the planner deliberately ignores. Mirroring the
 * planner's view first gives us a clean comparison surface; iterative-cost
 * (Option B) is a future projector layer if leaf-4 finds the static gap too
 * wide to tune through.
 *
 * # Beat-2 sketch scope
 *
 * This file ships the beat-2 (first loop ends) projection only. Beat-2 is
 * the cleanest test case: single-loop, all levels start at 0, no cross-loop
 * coupling. If projection matches sim within tolerance, expand to beats 3-8
 * via a multi-loop integrator that recurses `integrateLoop` across the arc.
 * If it doesn't match, we debug the missing physics on the simplest beat
 * before generalizing.
 */

import { InitialManaKey } from '../modules';
import {
  DEFAULT_PARAMS,
  generatePlan,
  projectActionVectors,
  type ActionVector,
  type PlannerAccessor,
  type PlannerParams,
  type PlannedItem,
} from './planner';

/** Engine TPS — mana drains at 1 per engine tick while a queue action runs. */
export const DEFAULT_TPS = 20;

export interface BeatFireProjection {
  beatId: string;
  /** Projected fire time in seconds. `Infinity` only if neither mana nor queue can drain (no plan, no budget). */
  seconds: number;
  /** Diagnostic breakdown for sim-vs-projection comparison. */
  breakdown: {
    initialMana: number;
    planLength: number;
    planTotalCost: number;
    projectedManaAdded: number;
    consumedAtFire: number;
    executedItems: number;
    /** `null` = no partial item; otherwise the loop-count of the last (partially-executed) item. */
    partialTailLoops: number | null;
    /**
     * Loop-end mode: `'queue-empty'` (plan exhausts under budget — `shouldRestart`
     * fires) or `'mana-zero'` (mana drains to 0 mid-plan).
     */
    endMode: 'queue-empty' | 'mana-zero' | 'unreached';
  };
}

/**
 * Project beat-2 (first loop ends) fire time.
 *
 * Loop end fires on EITHER `mana <= 0` OR `shouldRestart` — the queue sets
 * `shouldRestart` when its plan exhausts (`looper/modules/loop.ts:113`).
 * So loop 1 ends at the EARLIER of:
 *   - queue exhaustion: `planTotalCost / tps` seconds (drain matches plan cost)
 *   - mana exhaustion : `(initialMana + manaAdded) / tps` (drain hits zero
 *     before plan completes)
 *
 * Mana drains 1-per-engine-tick unconditionally while the loop runs (the
 * `onTick` drain doesn't gate on queue activity), so the "elapsed seconds"
 * in either mode equals "mana drained / tps".
 *
 * `manaAdded` grows only if the plan's regular-type rewards fire mid-loop.
 * Under DEFAULT_PARAMS at loop 1, empty `progressionTarget` keeps
 * progressVars at 0 → regular pools have 0 capacity → no rewards → `manaAdded
 * = 0`. The fixed-point logic still runs so non-default params resolve
 * correctly.
 */
export function projectBeatFireTime(
  engine: PlannerAccessor,
  params: PlannerParams = DEFAULT_PARAMS,
  beatId: 'beat-2' = 'beat-2',
  tps: number = DEFAULT_TPS,
): BeatFireProjection {
  const plan = generatePlan(engine, params);
  const vectors = projectActionVectors(engine);
  const vectorById = new Map<string, ActionVector>();
  for (const v of vectors) vectorById.set(v.def.id, v);

  const initialManaRef = engine.tryInject(InitialManaKey);
  const initialMana = Number(initialManaRef?.value ?? 0);

  const planTotalCost = plan.reduce((sum, item) => {
    const v = vectorById.get(item.actionId);
    return sum + (v ? v.adjustedTicks * item.loops : 0);
  }, 0);

  let consumed = 0;
  let manaAdded = 0;
  let executedItems = 0;
  let partialTailLoops: number | null = null;
  let endMode: 'queue-empty' | 'mana-zero' | 'unreached' = 'unreached';

  const consumeItem = (item: PlannedItem): 'full' | 'partial' | 'stop' => {
    const v = vectorById.get(item.actionId);
    if (!v) return 'full';
    const fullCost = v.adjustedTicks * item.loops;
    const budget = initialMana + manaAdded;
    if (consumed + fullCost <= budget) {
      consumed += fullCost;
      manaAdded += v.manaPerCompletion * item.loops;
      return 'full';
    }
    const remaining = budget - consumed;
    if (remaining < v.adjustedTicks) return 'stop';
    const partial = Math.floor(remaining / v.adjustedTicks);
    consumed += v.adjustedTicks * partial;
    manaAdded += v.manaPerCompletion * partial;
    partialTailLoops = partial;
    return 'partial';
  };

  for (const item of plan) {
    const outcome = consumeItem(item);
    if (outcome === 'full') {
      executedItems++;
      continue;
    }
    if (outcome === 'partial') {
      executedItems++;
      endMode = 'mana-zero';
    } else {
      endMode = 'mana-zero';
    }
    break;
  }

  if (endMode === 'unreached') {
    // Plan executed in full without hitting budget: queue emptied →
    // shouldRestart fires → loop ends at "queue exhausted" time, NOT at
    // mana-zero. Mana keeps draining 1/tick after queue empty, but the
    // loop's endCondition fires on shouldRestart immediately, so elapsed
    // time = consumed / tps where consumed = planTotalCost.
    endMode = 'queue-empty';
  }

  const seconds = consumed > 0 ? consumed / tps : Infinity;

  return {
    beatId,
    seconds,
    breakdown: {
      initialMana,
      planLength: plan.length,
      planTotalCost,
      projectedManaAdded: manaAdded,
      consumedAtFire: consumed,
      executedItems,
      partialTailLoops,
      endMode,
    },
  };
}

/**
 * Convert a projection's raw fire time to the value `runUntil(tickDelta)`
 * would report. Two corrections compose:
 *
 *   - **Engine detection lag.** Queue-empty mode incurs a 1-engine-tick lag
 *     between the last action completing (cursor advance) and `shouldRestart`
 *     surfacing in `endCondition`. Mana-zero mode is processed in the same
 *     engine tick as the drain, so no lag. (Validated against beat-2 sketch:
 *     raw=11.00s, sim at tickDelta=0.05s reports 11.05s, exactly 1/tps.)
 *   - **Predicate-check granularity.** `runUntil` checks the predicate after
 *     each `simulateTick(tickDelta)`, so any event in `(N·tickDelta,
 *     (N+1)·tickDelta]` reports as `(N+1)·tickDelta`. Mathematical ceiling.
 */
export function simulatedFireSeconds(
  projection: BeatFireProjection,
  tickDelta: number,
  tps: number = DEFAULT_TPS,
): number {
  if (!isFinite(projection.seconds)) return Infinity;
  const lag = projection.breakdown.endMode === 'queue-empty' ? 1 / tps : 0;
  const real = projection.seconds + lag;
  return Math.ceil(real / tickDelta) * tickDelta;
}

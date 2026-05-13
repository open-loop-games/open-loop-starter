/**
 * Looper balance — queue-executing deterministic sim engine.
 *
 * Wraps `createLooperEngine` with a bot module that drives a multi-loop
 * schedule: a sequence of per-loop queues the solver constructs. Each
 * entry in the schedule names the `(actionId, repeats)` pairs for one
 * loop; the bot swaps the edit queue before each loop ends so the
 * looper's existing `restartActionQueue` (in `loop.ts`'s `onRestart`)
 * promotes the new queue into active.
 *
 * Engine-as-oracle: the bot does not reimplement queue dispatch — it
 * only schedules which queue runs next. Action execution, mana drain,
 * XP accrual, completion-effects, and progress-var level-ups all flow
 * through the looper's existing modules. Mirrors the producer/ambient
 * `bot.ts` shape — install one module that owns bot-local state in
 * persistent refs, build the engine with that module appended via
 * `extraModules`.
 *
 * Once the algorithm-choice prototype settles (A* + beam side-by-side
 * on `forest ≥ 1`), the solver feeds its chosen trajectory in as a
 * `LoopSchedule`; `runUntil` drives engine ticks until the goal predicate
 * fires or the budget caps. Perturbation sweeps re-build a fresh engine
 * per cell via the same `buildLooperSimEngine` entrypoint.
 */

import {
  bn,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
} from '@open-loop/engine';
import { createLooperEngine } from '..';
import { addAction, clearActions, getLoop, getLoopCount, getMana, startLoop } from '../modules';

// ─── Schedule shape ───────────────────────────────────────────────────────

/** One entry in a per-loop queue. */
export interface ScheduleItem {
  actionId: string;
  /** Number of times this entry repeats (`SequencerItem.metadata.loops`). */
  repeats: number;
}

/** One loop's worth of queue items, ordered top-to-bottom in the queue. */
export type LoopQueue = ReadonlyArray<ScheduleItem>;

/** A solver-chosen trajectory: a sequence of per-loop queues. */
export type LoopSchedule = ReadonlyArray<LoopQueue>;

// ─── Bot module ───────────────────────────────────────────────────────────

let engineCounter = 0;

/**
 * Populate the edit queue with one loop's items. Cleared first so each
 * call replaces the queue wholesale rather than appending.
 */
function loadEditQueue(queue: LoopQueue): void {
  clearActions();
  for (const item of queue) {
    addAction(item.actionId, item.repeats);
  }
}

/**
 * Bot module wiring. Loads `schedule[0]` into the edit queue at install,
 * starts the loop, and subscribes to `loop.on('beforeRestart')` so each
 * end-of-loop transition swaps in the next entry's queue (loop's own
 * `onRestart` then promotes edit→active via `restartActionQueue`).
 *
 * When the schedule exhausts, the bot leaves the active queue as-is —
 * the looper's queue dispatcher will replay the last queue until
 * `runUntil` terminates on the goal predicate or hits the budget cap.
 * Solvers that want hard termination at schedule-end should append a
 * terminal sentinel queue (e.g. an empty queue) that exhausts immediately.
 */
function createBalanceBotModule(schedule: LoopSchedule): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['loop', 'action-runner'],
    install() {
      if (schedule.length === 0) {
        throw new Error('looper/balance/bot: schedule must contain at least one loop queue');
      }

      // Loop 0 — populate edit queue, then start the loop. `startLoop`
      // calls `bootstrapActiveFromSave` which promotes edit→active when
      // active is empty.
      loadEditQueue(schedule[0]!);
      startLoop();

      // Subsequent loops — swap the edit queue before the loop module's
      // own `onRestart` fires (which copies edit→active). `getLoopCount`
      // increments inside the Loop primitive's reset sequence between
      // `beforeRestart` and `onRestart`, so the loop counter at this
      // event-firing time is the just-finished loop's index (0-indexed
      // count means schedule index for the *next* loop is the current
      // count).
      const loop = getLoop();
      loop.on('beforeRestart', () => {
        const nextIndex = getLoopCount().value;
        if (nextIndex < schedule.length) {
          loadEditQueue(schedule[nextIndex]!);
        }
        // Past the schedule: leave the edit queue as-is so the last
        // queue replays. Solvers that need a definite end append a
        // sentinel queue.
      });
    },
  };
}

// ─── Build + accessor ─────────────────────────────────────────────────────

/**
 * Build a started, sim-bot-driven engine for the Looper archetype.
 *
 * Wires:
 *   - The bot module appended via `extraModules`, which owns the queue-
 *     scheduling lifecycle.
 *   - Per-instance `persistenceNamespace` so parallel solver iterations
 *     don't collide in storage (matches producer/ambient/tug shape).
 *
 * Caller drives the engine via `runUntil` / `runMatrixUntil`. The engine
 * has been `start()`ed and immediately `stop()`ped so the real-time
 * interval doesn't fire; solver iterations advance via
 * `engine.loop.stepOnce()` from `runUntil`.
 *
 * Solver flow:
 *   1. Construct a candidate `LoopSchedule`.
 *   2. `engine = buildLooperSimEngine(schedule, tunables)`.
 *   3. `runUntil(engine, { until: () => evaluateGoal(goal.predicate, engine), maxSimTime: goal.budgetSec })`.
 *   4. Check `terminated` — `'predicate'` is reachable; `'maxSimTime'` is
 *      not (or not within budget).
 */
export function buildLooperSimEngine(
  schedule: LoopSchedule,
  options?: { maxDeltaTime?: number },
): Engine {
  const namespace = `looper-balance-${++engineCounter}`;
  const { engine } = createLooperEngine({
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule(schedule)],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('classic-adventuring');
  engine.start();
  engine.stop();
  return engine;
}

/**
 * Accessor for `runProbe({mode: 'event'})` benches and any harness that
 * drives the content walker over a Looper engine. Keyed by resource id.
 *
 * Looper has multiple out-of-band rate channels (mana drain via tick
 * callback, per-completion XP, reward-effect mana adds) — `getRate`
 * does NOT faithfully capture income shape, so stasis-aware-tick mode
 * is unsound for this archetype (N=2 confirmation of OL-956's rule
 * promoted from BALANCING-ambient log-local; verdict in BALANCING-looper
 * once the per-archetype log lands). The accessor reports zero-rate for
 * mana to flag the unfaithful surface explicitly.
 */
export function buildLooperAccessor(_engine: Engine): GameStateAccessor {
  return {
    getResource: (id: string) => {
      if (id === 'mana') return bn(getMana().value as DecimalSource);
      return bn(0);
    },
    // Mana drain is not a `getRate`-captured channel — see file header.
    getRate: () => bn(0),
    isUnlocked: () => false,
    getState: () => undefined,
  };
}

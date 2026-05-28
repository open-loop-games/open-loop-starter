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
 * Build-once, swap-per-iteration. The bot module installs once and
 * publishes a {@link BalanceBotControlKey} setter. Solvers call
 * `engine.saveManager.importSave(initialBlob)` to reset game state, then
 * `control.setSchedule(next)` to load the candidate trajectory, then
 * `runUntil` to drive the engine to the goal predicate or budget cap.
 * Mirrors the producer/ambient one-engine + importSave-per-iteration
 * canonical pattern. Rebuilding the engine per iteration is the wrong
 * shape — module install runs once; closure-local bot state would leak
 * across iterations.
 *
 * Critical detail: the looper's `activeLoopQueue` / `editLoopQueue`
 * Sequencer state is NOT inside `withPersistentContext` — its items array
 * is a Vue ref, not a Persistent ref, and `importSave` doesn't restore
 * it. Without explicit handling, queue state from the prior rollout leaks
 * into the next one (the candidate queue only takes effect after one
 * residual loop completes). `setSchedule` therefore promotes edit → active
 * immediately via `restartActionQueue` so the candidate queue runs on the
 * loop that's about to start, not the one after.
 *
 * Engine-as-oracle: the bot does not reimplement queue dispatch — it
 * only schedules which queue runs next. Action execution, mana drain,
 * XP accrual, completion-effects, and progress-var level-ups all flow
 * through the looper's existing modules.
 */

import {
  bn,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
  type InjectionKey,
} from '@open-loop/engine';
import { createLooperEngine } from '..';
import {
  addAction,
  clearActions,
  getActionDef,
  getActiveLoopCategory,
  getLoop,
  getLoopCount,
  getMana,
  restartActionQueue,
  startLoop,
  unlockZone,
} from '../modules';

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

// ─── Bot control surface ──────────────────────────────────────────────────

/**
 * Solver-facing control over the bot's active schedule. Published by the
 * bot module's `install()` and consumed by solver iterations after
 * `saveManager.importSave(initialBlob)` resets game state.
 *
 * `setSchedule` is the only public mutation. It clears the edit queue,
 * loads `schedule[0]` into edit, and arms the `beforeRestart` subscriber
 * so subsequent loops swap to `schedule[loopCount]` automatically. When
 * `loopCount` exceeds the schedule length the bot leaves the queue
 * untouched and the last queue replays — solvers needing a definite end
 * append a sentinel empty queue.
 */
export interface BalanceBotControl {
  setSchedule(schedule: LoopSchedule): void;
}

export const BalanceBotControlKey: InjectionKey<BalanceBotControl> = Symbol(
  'looper/balance/bot-control',
) as InjectionKey<BalanceBotControl>;

// ─── Bot module ───────────────────────────────────────────────────────────

let engineCounter = 0;

/** Populate the edit queue with one loop's items. */
function loadEditQueue(queue: LoopQueue): void {
  clearActions();
  for (const item of queue) {
    addAction(item.actionId, item.repeats);
  }
}

/**
 * Wrap action-runner's `canRun` gate so that wrong-zone items auto-switch
 * zones instead of being skipped. The default gate (built from per-mapping
 * canRun composition inside `createActionCategory`) returns `'never'` when
 * `def.zoneId !== getCurrentZone()`; UI players resolve this by clicking a
 * zone selector mid-loop. The bot has no UI, and Sequencer emits `'skip'`
 * (not `'start'`) on a `'never'` gate, so a post-hoc `'start'` event handler
 * can't catch the wrong-zone case in time. Replacing the underlying
 * sequencer's composed `canRun` lets the bot unlock + select the action's
 * zone before the gate's zone check, so mixed-zone queues like
 * `[smash-pots, explore-forest]` run end-to-end.
 *
 * NOTE: this assignment bypasses ActionCategory's per-def `canRun`
 * composition (the engine wires it inside `createActionCategory` and stores
 * the composed fn on `sequencer.canRun`). We re-wrap that composed fn here,
 * so per-def `canRun` still fires through `original(item)` — intentional for
 * balance-mode determinism. Player-facing engine instances don't install
 * this module, so the UI zone-selection contract is preserved for production
 * play.
 */
function installZoneAutoSelectGate(): void {
  const sequencer = getActiveLoopCategory().sequencer;
  const original = sequencer.canRun;
  sequencer.canRun = (item) => {
    const def = getActionDef(item.id);
    if (def && def.zoneId === 'forest-path') {
      unlockZone('forest-path', true);
    }
    return original ? original(item) : 'now';
  };
}

/**
 * Bot module wiring. Subscribes to `loop.on('beforeRestart')` once; the
 * active schedule is mutable state owned by the module closure and swapped
 * by `setSchedule` between solver iterations.
 *
 * `beforeRestart` fires after the loop's reset sequence has incremented
 * `loopCount`, so the value read inside the handler is the index of the
 * loop about to start. Edit→active promotion happens in the loop module's
 * own `onRestart` (which runs after this `beforeRestart`).
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['loop', 'action-runner'],
    install(ctx) {
      installZoneAutoSelectGate();

      let activeSchedule: LoopSchedule | null = null;

      const control: BalanceBotControl = {
        setSchedule(schedule: LoopSchedule) {
          if (schedule.length === 0) {
            throw new Error('looper/balance/bot: schedule must contain at least one loop queue');
          }
          activeSchedule = schedule;
          loadEditQueue(schedule[0]!);
          // Force the candidate queue to take effect on the *current* loop.
          // Without this, the active queue inherits whatever the engine
          // instance last ran (a prior rollout's queue) because Sequencer
          // state isn't part of the save envelope. See file header.
          restartActionQueue();
          startLoop();
        },
      };

      const loop = getLoop();
      loop.on('beforeRestart', () => {
        if (activeSchedule === null) return;
        const nextIndex = getLoopCount().value;
        if (nextIndex < activeSchedule.length) {
          loadEditQueue(activeSchedule[nextIndex]!);
        }
        // Past schedule end: leave edit queue as-is (last queue replays).
      });

      ctx.provide(BalanceBotControlKey, control);
    },
  };
}

// ─── Build + accessor ─────────────────────────────────────────────────────

/**
 * Build a started, sim-bot-driven engine for the Looper archetype. The
 * engine has been `start()`ed and immediately `stop()`ped so the real-time
 * interval doesn't fire; solver iterations advance via
 * `engine.tickDriver.stepOnce()` from `runUntil`.
 *
 * Solver flow (one engine, many iterations):
 *
 *   1. `const engine = buildLooperSimEngine();`
 *   2. `const initialBlob = engine.saveManager!.exportSave();`
 *   3. `const control = engine.inject(BalanceBotControlKey);`
 *   4. Per iteration:
 *        `engine.saveManager!.importSave(initialBlob);`
 *        `control.setSchedule(candidate);`
 *        `runUntil({ engine, until: () => evaluateGoal(...), maxSimTime: goal.budgetSec });`
 *
 * Perturbation sweeps wrap each iteration in `tuningRegistry.pushScope`;
 * caller asserts `scopeDepth === 0` between iterations per BALANCING.md
 * § Load-bearing ceremony.
 */
export function buildLooperSimEngine(options?: { maxDeltaTime?: number }): Engine {
  const namespace = `looper-balance-${++engineCounter}`;
  const { engine } = createLooperEngine({
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule()],
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

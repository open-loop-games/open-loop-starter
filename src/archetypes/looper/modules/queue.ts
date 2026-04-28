import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
  Decimal,
  GameLoopKey,
  createSequencer,
  persistent,
  withPersistentContext,
  type DecimalSource,
  type EngineModule,
  type GameLoop,
  type InjectionKey,
  type Loop,
  type Persistent,
  type Sequencer,
} from 'open-loop-engine';
import type { LooperData, LooperGameState } from '../data/types';
import { ActionsKey } from './actions';
import { CapabilitiesKey } from './capabilities';
import { LoopKey } from './loop';
import { ManaKey } from './mana';

/**
 * Per-queue-item metadata. The queue is a cursor-walked plan (idle-loops
 * vanilla shape — `actions.js:135-148`): items persist across cursor
 * advances, `loopsLeft` decrements per execution, the cursor advances when
 * the count hits zero, and the plan survives the loop restart.
 */
export interface QueueItemMeta {
  /** Player-set repeat count (how many times this item runs each loop). */
  loops: number;
  /** Remaining repetitions on the current run; reset to `loops` on loop restart. */
  loopsLeft: number;
}

export const QueueKey: InjectionKey<Sequencer<QueueItemMeta>> = Symbol(
  'looper/queue',
) as InjectionKey<Sequencer<QueueItemMeta>>;

/**
 * Reactive ref that increments any time the queue items array mutates.
 * Vue templates reading `sequencer.items.value` directly may miss
 * mutations (incloneution `actions.ts:78-80` documents the same hack).
 * Components watching this counter re-render on enqueue / remove / reorder.
 */
export const QueueVersionKey: InjectionKey<Ref<number>> = Symbol(
  'looper/queue-version',
) as InjectionKey<Ref<number>>;

/**
 * Set true when the cursor exhausts the plan with no fallback available.
 * The loop module's `endCondition` reads this alongside `mana <= 0` so
 * "empty queue ⇒ loop ends" matches vanilla idle-loops `actions.js:103-108`.
 * Cleared in `LooperQueueModule.resetForLoop` on loop restart.
 */
export const QueueShouldRestartKey: InjectionKey<Ref<boolean>> = Symbol(
  'looper/queue-should-restart',
) as InjectionKey<Ref<boolean>>;

/** Persistent toggle for the canonical "Repeat Last Action" UX (vanilla `actions.js:137-147`). */
export const QueueRepeatLastActionKey: InjectionKey<Persistent<boolean>> = Symbol(
  'looper/queue-repeat-last',
) as InjectionKey<Persistent<boolean>>;

/**
 * Queue-derived mana totals used by the plan-budget readout. `total` covers
 * the full plan from the head; `fromCursor` covers cursor → end (what's
 * still needed to finish *this* run). Both sum `loopsLeft × adjustedTicks`
 * over the relevant span (vanilla `adjustTicksNeeded()` shape).
 */
export interface QueueManaNeeded {
  total: ComputedRef<DecimalSource>;
  fromCursor: ComputedRef<DecimalSource>;
}

export const QueueManaNeededKey: InjectionKey<QueueManaNeeded> = Symbol(
  'looper/queue-mana-needed',
) as InjectionKey<QueueManaNeeded>;

export interface LooperQueueModule {
  /**
   * Restore the plan to its head-of-loop state: per-item `loopsLeft = loops`,
   * cursor → 0, `shouldRestart` cleared. Called by `loop.ts` from inside
   * `onRestart`; if the queue is empty afterwards, the loop module pauses
   * (the sequencer's auto-start + the loop's run() trigger pick it back up
   * the next time the player enqueues something).
   */
  resetForLoop(): void;
}

export const QueueModuleKey: InjectionKey<LooperQueueModule> = Symbol(
  'looper/queue-module',
) as InjectionKey<LooperQueueModule>;

/**
 * Single-queue cursor-walked plan. Per-action `prereqs` gate visibility
 * (UI-side); `canStart` gates dispatch (here, via `canRun`'s tri-state):
 *
 *   - 'never'  — `def.canStart(state) === false`; cursor advances past
 *   - 'notNow' — mana exhausted OR loop paused; slot held until either
 *                resolves
 *   - 'now'    — dispatch
 *
 * Per-tick: gate on `loop.running`, advance the current action by
 * `round(tickRate × dt)` ticks, decrement `loopsLeft` on completion. When
 * `loopsLeft` hits zero, advance via `sequencer.complete()` (list mode →
 * cursor++, item NOT removed). When the cursor reaches end-of-plan, evaluate
 * the "Repeat Last Action" toggle: if on, bump the last item's `loops` and
 * `loopsLeft` by one and stay; if off, set `shouldRestart` so the loop's
 * `endCondition` fires.
 */
export function createQueueModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/queue',
    dependencies: ['looper/actions', 'looper/capabilities', 'looper/mana', 'looper/loop'],
    install(ctx) {
      const actions = ctx.inject(ActionsKey);
      const mana = ctx.inject(ManaKey);
      const loop: Loop = ctx.inject(LoopKey);
      const capabilities = ctx.inject(CapabilitiesKey);
      const gameLoop: GameLoop = ctx.inject(GameLoopKey);

      const queueVersion = ref(0);
      const shouldRestart = ref(false);

      const { repeatLastAction } = withPersistentContext('looper/queue', () => ({
        repeatLastAction: persistent<boolean>(false, { name: 'repeatLastAction' }),
      }));

      // State view passed to `def.canStart(state)`. Read-only projection over
      // live module refs so data files don't import modules.
      const stateView: LooperGameState = {
        manaAtLeast: (amount) => Decimal.gte(mana.value, amount),
        capabilityLevelAtLeast: (capabilityId, tier, n) => {
          const state = capabilities.getState(capabilityId);
          if (!state) return false;
          const level = tier === 'level' ? state.level.level.value : state.talent.level.value;
          return Decimal.gte(level, n);
        },
        actionCompletedAtLeast: (actionId, count) => actions.getTimesCompleted(actionId) >= count,
        loopCountAtLeast: (n) => loop.count.value >= n,
      };

      const sequencer = createSequencer<QueueItemMeta>({
        id: 'looper/queue',
        mode: 'list',
        canRun: (item) => {
          const def = actions.getDef(item.id);
          if (!def) return 'never';
          if (def.canStart && !def.canStart(stateView)) return 'never';
          if (Decimal.lte(mana.value, 0)) return 'notNow';
          return 'now';
        },
        registerTick: ctx.onTick,
      });
      // Note: canRun deliberately does not gate on `loop.running`. Otherwise
      // the first enqueue at boot (loop paused) holds in 'notNow' and never
      // emits 'start' — and `loop.ts`'s `'start'` subscription is what
      // promotes the loop from paused to running. The per-tick `loop.running`
      // gate below stops action progress while the loop is paused.

      function bumpLastForRepeat(cursorIdx: number, liveMeta: QueueItemMeta): void {
        const items = sequencer.items.value;
        const updated = [...items];
        updated[cursorIdx] = {
          ...updated[cursorIdx],
          metadata: {
            loops: liveMeta.loops + 1,
            loopsLeft: 1,
          },
        };
        sequencer.items.value = updated;
        queueVersion.value += 1;
      }

      function patchLoopsLeft(cursorIdx: number, newLoopsLeft: number): void {
        const items = sequencer.items.value;
        const updated = [...items];
        updated[cursorIdx] = {
          ...updated[cursorIdx],
          metadata: { ...updated[cursorIdx].metadata, loopsLeft: newLoopsLeft },
        };
        sequencer.items.value = updated;
      }

      // Per-tick dispatch. Mana drain is owned by `loop.ts`; this handler
      // only advances the active action's progress and walks the cursor.
      ctx.onTick((dt: number) => {
        if (!loop.running.value) return;
        if (Decimal.lte(mana.value, 0)) return;

        const items = sequencer.items.value;
        if (items.length === 0 || sequencer.cursor >= items.length) {
          shouldRestart.value = true;
          return;
        }

        const item = sequencer.currentItem;
        if (!item) return;

        const cursorIdx = sequencer.cursor;
        if (cursorIdx < 0 || cursorIdx >= items.length) return;

        // Convert dt → ticks (canonical pacing: `round(tickRate × dt)`).
        // At engine 20 TPS with dt=1/20, ticks = 1 per engine tick. The
        // round() prevents fractional progress drift across long runs.
        const ticks = Math.round(gameLoop.tickRate * dt);
        if (ticks <= 0) return;

        const completed = actions.tick(item.id, ticks);
        if (!completed) return;

        const liveMeta = items[cursorIdx].metadata;
        const newLoopsLeft = Math.max(0, liveMeta.loopsLeft - 1);

        if (newLoopsLeft > 0) {
          patchLoopsLeft(cursorIdx, newLoopsLeft);
          return;
        }

        // Final iteration of this item.
        const isLast = cursorIdx === items.length - 1;
        if (isLast && repeatLastAction.value) {
          // Stay on the last item; bump its planned loop count by one and
          // refresh loopsLeft so the next tick re-runs it. Avoids the
          // cursor-past-end state and the resetCursor-to-N gymnastics
          // (engine doesn't expose toIndex resets — sequencer.ts:222 TODO).
          bumpLastForRepeat(cursorIdx, liveMeta);
          return;
        }

        // Either non-last item, or last with repeat off → advance cursor.
        patchLoopsLeft(cursorIdx, 0);
        sequencer.complete();
        queueVersion.value += 1;

        // After complete() the cursor sits past the just-completed item.
        // If we've walked off the end with no items left to dispatch, the
        // plan is exhausted — signal the loop to restart.
        if (sequencer.cursor >= sequencer.items.value.length) {
          shouldRestart.value = true;
        }
      });

      sequencer.on('enqueue', () => {
        queueVersion.value += 1;
      });
      sequencer.on('skip', () => {
        queueVersion.value += 1;
      });

      function manaPlanTotal(fromCursor: boolean): Decimal {
        const items = sequencer.items.value;
        const start = fromCursor ? sequencer.cursor : 0;
        let total = new Decimal(0);
        for (let i = start; i < items.length; i++) {
          const it = items[i];
          const state = actions.getState(it.id);
          if (!state) continue;
          const reps =
            fromCursor && i === sequencer.cursor ? it.metadata.loopsLeft : it.metadata.loops;
          if (reps <= 0) continue;
          total = total.add(Decimal.mul(state.adjustedTicks.value, reps));
        }
        return total;
      }

      const manaNeeded: QueueManaNeeded = {
        total: computed(() => {
          void queueVersion.value;
          return manaPlanTotal(false);
        }),
        fromCursor: computed(() => {
          void queueVersion.value;
          return manaPlanTotal(true);
        }),
      };

      const moduleApi: LooperQueueModule = {
        resetForLoop(): void {
          shouldRestart.value = false;
          // Reset per-item loopsLeft → loops; replace the items array so
          // Vue refs and the engine's `set` writer both see the change.
          const items = sequencer.items.value;
          if (items.length > 0) {
            sequencer.items.value = items.map((item) => ({
              ...item,
              metadata: { ...item.metadata, loopsLeft: item.metadata.loops },
            }));
          }
          // Cursor → 0; if not paused, sequencer auto-dispatches items[0].
          sequencer.resetCursor();
          queueVersion.value += 1;
        },
      };

      ctx.provide(QueueKey, sequencer);
      ctx.provide(QueueVersionKey, queueVersion);
      ctx.provide(QueueShouldRestartKey, shouldRestart);
      ctx.provide(QueueRepeatLastActionKey, repeatLastAction);
      ctx.provide(QueueManaNeededKey, manaNeeded);
      ctx.provide(QueueModuleKey, moduleApi);
    },
  };
}

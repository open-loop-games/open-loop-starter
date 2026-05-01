import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
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
import type { LooperData } from '../data/types';
import { ActionsKey } from './actions';
import { CapabilitiesKey } from './capabilities';
import { GoldKey } from './gold';
import { LoopKey } from './loop';
import { ManaKey } from './mana';
import { createLooperGameState } from './prereqs';
import { ProgressVarsKey } from './progress-vars';

/**
 * Per-queue-item metadata. Same shape on both edit and active sides;
 * `loopsLeft` only mutates while the active list runs (the edit list always
 * has `loopsLeft === loops`).
 */
export interface QueueItemMeta {
  /** Player-set repeat count (how many times this item runs each loop). */
  loops: number;
  /** Remaining repetitions on the current run; reset to `loops` on loop restart. */
  loopsLeft: number;
}

/**
 * Edit-list entry — the persistent shape for the player's plan. Plain
 * `{ id, metadata }` so the engine's persistence can serialize it as a
 * single ref. Promoted to `SequencerItem<QueueItemMeta>` shape (identical
 * fields) when copied into the active list.
 */
export interface QueueEditEntry {
  id: string;
  metadata: QueueItemMeta;
}

export const QueueKey: InjectionKey<Sequencer<QueueItemMeta>> = Symbol(
  'looper/queue',
) as InjectionKey<Sequencer<QueueItemMeta>>;

/**
 * The persistent edit list (player's plan). Mutated by enqueue / reorder /
 * remove / clear via `LooperQueueModule`. Snapshotted into the active
 * sequencer at loop start (when `keepActiveLoopActive` is off) and at boot
 * via the post-load watch when active is empty.
 */
export const QueueEditListKey: InjectionKey<Persistent<QueueEditEntry[]>> = Symbol(
  'looper/queue-edit-list',
) as InjectionKey<Persistent<QueueEditEntry[]>>;

/**
 * Reactive ref that increments any time edit list or active list mutates.
 * Vue templates reading `sequencer.items.value` directly may miss
 * mutations (the engine's shallow ref doesn't always trigger downstream
 * computeds reliably). Components watching this counter re-render on
 * every queue change.
 */
export const QueueVersionKey: InjectionKey<Ref<number>> = Symbol(
  'looper/queue-version',
) as InjectionKey<Ref<number>>;

/**
 * Set true when the active list cursor exhausts the plan. The loop module's
 * `endCondition` reads this alongside `mana <= 0` so "empty active list ⇒
 * loop ends" matches vanilla idle-loops `actions.js:103-108`. Cleared in
 * `LooperQueueModule.resetForLoop` on loop restart.
 */
export const QueueShouldRestartKey: InjectionKey<Ref<boolean>> = Symbol(
  'looper/queue-should-restart',
) as InjectionKey<Ref<boolean>>;

/** Persistent toggle for the canonical "Repeat Last Action" UX (vanilla `actions.js:137-147`). */
export const QueueRepeatLastActionKey: InjectionKey<Persistent<boolean>> = Symbol(
  'looper/queue-repeat-last',
) as InjectionKey<Persistent<boolean>>;

/**
 * Persistent toggle: when true, the active list survives loop restart with
 * loopsLeft → loops + cursor → 0 only (no editList sync). When false
 * (default, vanilla shape), each loop start replaces the active list with a
 * fresh snapshot of editList — edits the player made mid-run apply on the
 * next loop boundary.
 */
export const QueueKeepActiveKey: InjectionKey<Persistent<boolean>> = Symbol(
  'looper/queue-keep-active',
) as InjectionKey<Persistent<boolean>>;

/**
 * Persistent toggle: when true, `enqueue` prepends new entries to editList
 * instead of appending. Vanilla "Add to Top" UX.
 */
export const QueueAddToTopKey: InjectionKey<Persistent<boolean>> = Symbol(
  'looper/queue-add-to-top',
) as InjectionKey<Persistent<boolean>>;

/**
 * Persistent loops-delta for per-row `+` / `-` and amount-aware enqueue.
 * Default 1 (vanilla idle-loops shape — 1 / 5 / 10 quick selectors live in
 * the UI). Each `+` bumps loops by this much; each `-` decrements (clamped
 * at 1 — 0 would mean "remove" and the player should use the ✕ control).
 */
export const QueueAddAmountKey: InjectionKey<Persistent<number>> = Symbol(
  'looper/queue-add-amount',
) as InjectionKey<Persistent<number>>;

/**
 * Plan-budget readouts. `editTotal` reflects the player's plan being
 * authored; `activeFromCursor` reflects what's still to dispatch on this
 * run. Both shown side-by-side in the queue UI so edits to editList don't
 * disturb the active-run progress readout (and vice versa).
 */
export interface QueueManaNeeded {
  /** Σ adjustedTicks × loops over editList — full pass cost of the edit plan. */
  editTotal: ComputedRef<DecimalSource>;
  /** Σ adjustedTicks × loopsLeft over activeList from cursor — what's left this run. */
  activeFromCursor: ComputedRef<DecimalSource>;
}

export const QueueManaNeededKey: InjectionKey<QueueManaNeeded> = Symbol(
  'looper/queue-mana-needed',
) as InjectionKey<QueueManaNeeded>;

export interface LooperQueueModule {
  /**
   * Restore the plan to its head-of-loop state. Branches on
   * `keepActiveLoopActive`:
   *   - false (default) → activeList ← clone(editList), cursor → 0.
   *   - true            → keep activeList; loopsLeft → loops, cursor → 0.
   * Called by `loop.ts` from inside `onRestart`. If the resulting active
   * list is empty, the loop module pauses (the sequencer's `'start'` event
   * picks it back up the next time editList sync produces a non-empty list).
   */
  resetForLoop(): void;
  /** Append (or prepend, when `addToTop` is on) an entry to editList. */
  enqueue(actionId: string, loops?: number): void;
  /** Remove an editList entry by index. */
  remove(index: number): void;
  /** Reorder an editList entry. */
  reorder(from: number, to: number): void;
  /** Insert a fresh entry at the given editList index (drag-drop landing). */
  insertAt(index: number, actionId: string, loops?: number): void;
  /** Clear editList. The active list keeps running until exhausted. */
  clear(): void;
  /** Set an editList entry's `loops` count directly (clamped to [1, ∞)). */
  adjustLoops(index: number, loops: number): void;
  /**
   * Replace activeList with a fresh snapshot of editList, cursor → 0. The
   * loop's `onRestart` calls this when `keepActiveLoopActive` is off, and
   * it runs eagerly at boot/post-load when the active list is empty but
   * editList has items.
   */
  applyEditToActive(): void;
  /**
   * Player-facing "Apply now" — flag the loop for restart so the next
   * onRestart cycle resets mana/gold/Level XP/action progress AND syncs
   * editList → activeList (via resetForLoop). Distinct from
   * `applyEditToActive` which only swaps items mid-run; this is the
   * canonical "the plan changed, start over" action.
   */
  requestRestart(): void;
}

export const QueueModuleKey: InjectionKey<LooperQueueModule> = Symbol(
  'looper/queue-module',
) as InjectionKey<LooperQueueModule>;

/**
 * Edit/active queue split (idle-loops vanilla shape):
 *
 *   - **editList** — the player's plan. `enqueue` / `reorder` / `remove` /
 *     `clear` mutate editList. Persistent across saves. Edits made mid-run
 *     do NOT disturb the active list — they apply on the next loop boundary
 *     (or via the `applyEditToActive` button).
 *   - **activeList** — the cursor-walked dispatch list. Sequencer items are
 *     the live dispatch state; refilled from editList at loop start when
 *     `keepActiveLoopActive` is off (default).
 *
 * Boot/post-load auto-promote: when the active list is empty and editList
 * has items, the watch below mirrors so the dispatcher has something to
 * walk and the sequencer's `'start'` event fires (kicking the loop into
 * running). Subsequent edits stay in editList only — they don't disrupt the
 * running plan.
 *
 * Per-action `prereqs` gate visibility (UI-side, in `usePrereqs`). `canStart`
 * gates dispatch via `canRun`'s tri-state:
 *   - 'never'  — `def.canStart(state) === false`; cursor advances past
 *   - 'notNow' — mana exhausted OR loop paused; slot held until either resolves
 *   - 'now'    — dispatch
 */
export function createQueueModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/queue',
    dependencies: [
      'looper/actions',
      'looper/capabilities',
      'looper/mana',
      'looper/gold',
      'looper/progress-vars',
      'looper/loop',
    ],
    install(ctx) {
      const actions = ctx.inject(ActionsKey);
      const mana = ctx.inject(ManaKey);
      const gold = ctx.inject(GoldKey);
      const loop: Loop = ctx.inject(LoopKey);
      const capabilities = ctx.inject(CapabilitiesKey);
      const progressVars = ctx.inject(ProgressVarsKey);
      const gameLoop: GameLoop = ctx.inject(GameLoopKey);

      const queueVersion = ref(0);
      const shouldRestart = ref(false);

      const { repeatLastAction, keepActiveLoopActive, addToTop, addAmount, editList } =
        withPersistentContext('looper/queue', () => ({
          repeatLastAction: persistent<boolean>(false, { name: 'repeatLastAction' }),
          keepActiveLoopActive: persistent<boolean>(false, { name: 'keepActiveLoopActive' }),
          addToTop: persistent<boolean>(false, { name: 'addToTop' }),
          addAmount: persistent<number>(1, { name: 'addAmount' }),
          editList: persistent<QueueEditEntry[]>([], { name: 'editList' }),
        }));

      // State view passed to `def.canStart(state)` predicates. Built via the
      // shared `createLooperGameState` so the queue dispatcher and UI-side
      // prereq evaluation (`composables/usePrereqs`) consume the same
      // canonical view of module state.
      const stateView = createLooperGameState({
        mana,
        gold,
        capabilities,
        progressVars,
        actions,
        loop,
      });

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

      function bumpVersion(): void {
        queueVersion.value += 1;
      }

      // ── Edit operations ─────────────────────────────────────────────────
      // All edit ops mutate editList. The active list is independent — it
      // re-syncs on loop start (or eagerly at boot when active is empty).

      function makeEntry(actionId: string, loops: number): QueueEditEntry {
        const safe = Math.max(1, Math.floor(loops || 1));
        return { id: actionId, metadata: { loops: safe, loopsLeft: safe } };
      }

      function enqueue(actionId: string, loops = 1): void {
        const entry = makeEntry(actionId, loops);
        editList.value = addToTop.value ? [entry, ...editList.value] : [...editList.value, entry];
        bumpVersion();
        // Boot/first-enqueue auto-promote — see watch below.
      }

      function insertAt(index: number, actionId: string, loops = 1): void {
        const entry = makeEntry(actionId, loops);
        const next = [...editList.value];
        const safeIdx = Math.max(0, Math.min(next.length, index));
        next.splice(safeIdx, 0, entry);
        editList.value = next;
        bumpVersion();
      }

      function remove(index: number): void {
        const list = editList.value;
        if (index < 0 || index >= list.length) return;
        const next = [...list];
        next.splice(index, 1);
        editList.value = next;
        bumpVersion();
      }

      function reorder(from: number, to: number): void {
        const list = editList.value;
        if (from === to) return;
        if (from < 0 || from >= list.length) return;
        if (to < 0 || to >= list.length) return;
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        editList.value = next;
        bumpVersion();
      }

      function clear(): void {
        if (editList.value.length === 0) return;
        editList.value = [];
        bumpVersion();
      }

      function adjustLoops(index: number, loops: number): void {
        const list = editList.value;
        if (index < 0 || index >= list.length) return;
        const safe = Math.max(1, Math.floor(loops || 1));
        if (list[index].metadata.loops === safe) return;
        const next = [...list];
        next[index] = {
          ...next[index],
          metadata: { loops: safe, loopsLeft: safe },
        };
        editList.value = next;
        bumpVersion();
      }

      function requestRestart(): void {
        // Synchronous restart — calls `loop.end()` directly so the player's
        // "Apply now" click resolves the same tick: pre-hook → stats → reset
        // Level XP / action progress / mana / gold → onRestart →
        // resetForLoop → applyEditToActive (when keepActive is off).
        // shouldRestart is the deferred path used when the queue itself
        // observes plan exhaustion mid-tick; user-initiated restarts go
        // through end() so "now" means now.
        loop.end();
      }

      // ── Active-list snapshot from edit list ─────────────────────────────

      function applyEditToActive(): void {
        // Replace active items with a fresh snapshot of editList. Each entry
        // gets clean { loops, loopsLeft = loops } metadata. resetCursor
        // auto-dispatches items[0] (firing the sequencer's 'start' event,
        // which the loop module subscribes to and promotes paused → running).
        const snapshot = editList.value.map((e) => ({
          id: e.id,
          metadata: { loops: e.metadata.loops, loopsLeft: e.metadata.loops },
        }));
        sequencer.items.value = snapshot;
        sequencer.resetCursor();
        shouldRestart.value = false;
        bumpVersion();
      }

      function refreshActiveLoopsLeft(): void {
        // keepActiveLoopActive path — preserve the active snapshot, just
        // reset per-item loopsLeft → loops, cursor → 0.
        const items = sequencer.items.value;
        if (items.length === 0) return;
        sequencer.items.value = items.map((item) => ({
          ...item,
          metadata: { ...item.metadata, loopsLeft: item.metadata.loops },
        }));
        sequencer.resetCursor();
      }

      function resetForLoop(): void {
        shouldRestart.value = false;
        if (keepActiveLoopActive.value) {
          refreshActiveLoopsLeft();
          bumpVersion();
        } else {
          applyEditToActive();
        }
      }

      // Boot + post-load + post-edit auto-promote: when the active list is
      // empty and editList has items, mirror so the dispatcher has something
      // to walk. Handles three cases:
      //   1. Save load — install runs first (editList = []), then the engine
      //      load() rehydrates editList; this watch fires on the rehydration.
      //   2. First enqueue at boot — editList goes from [] to [item], active
      //      empty; this watch promotes immediately so 'start' fires.
      //   3. Mid-run clear-then-add — if the player clears edit (active
      //      keeps running until exhaustion, then on loop end active also
      //      clears), then re-adds, the new edit promotes on the next add.
      watch(
        () => editList.value.length,
        (newLen) => {
          if (newLen > 0 && sequencer.items.value.length === 0) {
            applyEditToActive();
          }
        },
        { immediate: true, flush: 'sync' },
      );

      // ── Per-tick dispatch (active list) ─────────────────────────────────

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
        bumpVersion();
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

      ctx.onTick((dt: number) => {
        if (!loop.running.value) return;

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
        bumpVersion();

        // After complete() the cursor sits past the just-completed item.
        // If we've walked off the end with no items left to dispatch, the
        // plan is exhausted — signal the loop to restart.
        if (sequencer.cursor >= sequencer.items.value.length) {
          shouldRestart.value = true;
        }
      });

      sequencer.on('enqueue', () => bumpVersion());
      sequencer.on('skip', () => bumpVersion());

      // ── Mana-needed readouts ────────────────────────────────────────────

      function manaForEditList(): Decimal {
        let total = new Decimal(0);
        for (const entry of editList.value) {
          const state = actions.getState(entry.id);
          if (!state) continue;
          const reps = entry.metadata.loops;
          if (reps <= 0) continue;
          total = total.add(Decimal.mul(state.adjustedTicks.value, reps));
        }
        return total;
      }

      function manaForActiveFromCursor(): Decimal {
        const items = sequencer.items.value;
        let total = new Decimal(0);
        for (let i = sequencer.cursor; i < items.length; i++) {
          const it = items[i];
          const state = actions.getState(it.id);
          if (!state) continue;
          const reps = i === sequencer.cursor ? it.metadata.loopsLeft : it.metadata.loops;
          if (reps <= 0) continue;
          total = total.add(Decimal.mul(state.adjustedTicks.value, reps));
        }
        return total;
      }

      const manaNeeded: QueueManaNeeded = {
        editTotal: computed(() => {
          void queueVersion.value;
          return manaForEditList();
        }),
        activeFromCursor: computed(() => {
          void queueVersion.value;
          return manaForActiveFromCursor();
        }),
      };

      const moduleApi: LooperQueueModule = {
        resetForLoop,
        enqueue,
        remove,
        reorder,
        insertAt,
        clear,
        adjustLoops,
        applyEditToActive,
        requestRestart,
      };

      ctx.provide(QueueKey, sequencer);
      ctx.provide(QueueEditListKey, editList);
      ctx.provide(QueueVersionKey, queueVersion);
      ctx.provide(QueueShouldRestartKey, shouldRestart);
      ctx.provide(QueueRepeatLastActionKey, repeatLastAction);
      ctx.provide(QueueKeepActiveKey, keepActiveLoopActive);
      ctx.provide(QueueAddToTopKey, addToTop);
      ctx.provide(QueueAddAmountKey, addAmount);
      ctx.provide(QueueManaNeededKey, manaNeeded);
      ctx.provide(QueueModuleKey, moduleApi);
    },
  };
}

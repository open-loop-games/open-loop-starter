import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { DecimalSource, Persistent, SequencerItem } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import {
  QueueAddAmountKey,
  QueueAddToTopKey,
  QueueEditListKey,
  QueueKeepActiveKey,
  QueueKey,
  QueueManaNeededKey,
  QueueModuleKey,
  QueueRepeatLastActionKey,
  QueueShouldRestartKey,
  QueueVersionKey,
  type QueueEditEntry,
  type QueueItemMeta,
} from '../modules';

export interface QueueView {
  /** Player's plan — mutated by enqueue / reorder / remove / clear. */
  editItems: ComputedRef<QueueEditEntry[]>;
  /** Cursor-walked dispatch list. Refreshed from editItems at loop start. */
  activeItems: ComputedRef<SequencerItem<QueueItemMeta>[]>;
  /** Currently-dispatched item from the active list. */
  current: ComputedRef<SequencerItem<QueueItemMeta> | null>;
  /** Cursor position in the active list. */
  cursor: ComputedRef<number>;
  isPaused: ComputedRef<boolean>;
  isHolding: ComputedRef<boolean>;
  /** Σ adjustedTicks × loopsLeft over activeList from cursor — what's left this run. */
  manaActiveFromCursor: ComputedRef<DecimalSource>;
  /** Σ adjustedTicks × loops over editList — full-pass cost of the player's plan. */
  manaEditTotal: ComputedRef<DecimalSource>;
  /** Plan is exhausted; loop's endCondition will fire on the next tick. */
  shouldRestart: Ref<boolean>;
  /** Vanilla "Repeat Last Action" toggle (`actions.js:137-147`). */
  repeatLastAction: Persistent<boolean>;
  /** Vanilla "Keep Current List Active" toggle — preserve activeList across loop reset. */
  keepActiveLoopActive: Persistent<boolean>;
  /** Vanilla "Add to Top" toggle — enqueue prepends instead of appending. */
  addToTop: Persistent<boolean>;
  /** Loops-delta for per-row +/- and amount-aware enqueue. Default 1. */
  addAmount: Persistent<number>;
  enqueue(actionId: string, loops?: number): void;
  insertAt(index: number, actionId: string, loops?: number): void;
  remove(index: number): void;
  reorder(from: number, to: number): void;
  clear(): void;
  /** Set an editList row's loops count (clamped to ≥1). */
  adjustLoops(index: number, loops: number): void;
  togglePause(): void;
  /**
   * Player-facing "Apply now" — flag the loop for restart so the next
   * `onRestart` cycle resets mana, gold, Level XP, and action progress AND
   * snapshots editList → activeList (when keepActive is off). The
   * non-resetting mid-run swap (`applyEditToActive` on the module) is
   * internal — it's how the watch + loop machinery wire the snapshot —
   * and intentionally not exposed as a UI affordance.
   */
  requestRestart(): void;
}

export function useQueue(): QueueView {
  const sequencer = useModule(QueueKey);
  const editList = useModule(QueueEditListKey);
  const queueModule = useModule(QueueModuleKey);
  const queueVersion = useModule(QueueVersionKey);
  const sr = useModule(QueueShouldRestartKey);
  const repeat = useModule(QueueRepeatLastActionKey);
  const keepActive = useModule(QueueKeepActiveKey);
  const addToTop = useModule(QueueAddToTopKey);
  const addAmount = useModule(QueueAddAmountKey);
  const needed = useModule(QueueManaNeededKey);

  // Bind reads to queueVersion so re-orders / removes / enqueues / dispatch
  // ticks invalidate the computed even though the engine's shallow refs
  // don't always trigger downstream computeds reliably.
  const editItems = computed<QueueEditEntry[]>(() => {
    void queueVersion.value;
    return [...editList.value];
  });

  const activeItems = computed<SequencerItem<QueueItemMeta>[]>(() => {
    void queueVersion.value;
    return [...sequencer.items.value];
  });

  const current = computed<SequencerItem<QueueItemMeta> | null>(() => {
    void queueVersion.value;
    return sequencer.currentItem;
  });

  const cursor = computed<number>(() => {
    void queueVersion.value;
    return sequencer.cursor;
  });

  const isPaused = computed(() => sequencer.paused.value);
  const isHolding = computed(() => {
    void queueVersion.value;
    return sequencer.holding;
  });

  return {
    editItems,
    activeItems,
    current,
    cursor,
    isPaused,
    isHolding,
    manaActiveFromCursor: needed.activeFromCursor,
    manaEditTotal: needed.editTotal,
    shouldRestart: sr,
    repeatLastAction: repeat,
    keepActiveLoopActive: keepActive,
    addToTop,
    addAmount,
    enqueue: (actionId, loops = 1) => queueModule.enqueue(actionId, loops),
    insertAt: (index, actionId, loops = 1) => queueModule.insertAt(index, actionId, loops),
    remove: (index) => queueModule.remove(index),
    reorder: (from, to) => queueModule.reorder(from, to),
    clear: () => queueModule.clear(),
    adjustLoops: (index, loops) => queueModule.adjustLoops(index, loops),
    togglePause: () => sequencer.togglePause(),
    requestRestart: () => queueModule.requestRestart(),
  };
}

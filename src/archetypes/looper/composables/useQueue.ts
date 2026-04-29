import { computed } from 'vue';
import type {
  ComputedRef,
  DecimalSource,
  EngineRef,
  Persistent,
  SequencerItem,
} from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import {
  QueueKey,
  QueueManaNeededKey,
  QueueRepeatLastActionKey,
  QueueShouldRestartKey,
  QueueVersionKey,
  type QueueItemMeta,
} from '../modules';

export interface QueueView {
  items: ComputedRef<SequencerItem<QueueItemMeta>[]>;
  current: ComputedRef<SequencerItem<QueueItemMeta> | null>;
  cursor: ComputedRef<number>;
  isPaused: ComputedRef<boolean>;
  isHolding: ComputedRef<boolean>;
  /** Mana sim-seconds needed to finish the *active* run from the cursor onward. */
  manaNeededFromCursor: ComputedRef<DecimalSource>;
  /** Mana sim-seconds needed for one full pass of the plan. */
  manaNeededTotal: ComputedRef<DecimalSource>;
  /** Plan is exhausted; loop's endCondition will fire on the next tick. */
  shouldRestart: EngineRef<boolean>;
  /** Vanilla "Repeat Last Action" toggle (`actions.js:137-147`). */
  repeatLastAction: Persistent<boolean>;
  enqueue(actionId: string, loops?: number): void;
  remove(index: number): void;
  reorder(from: number, to: number): void;
  clear(): void;
  togglePause(): void;
}

export function useQueue(): QueueView {
  const sequencer = useModule(QueueKey);
  const queueVersion = useModule(QueueVersionKey);
  const sr = useModule(QueueShouldRestartKey);
  const repeat = useModule(QueueRepeatLastActionKey);
  const needed = useModule(QueueManaNeededKey);

  // Bind reads to queueVersion so re-orders / removes / enqueues invalidate
  // the computed even though `sequencer.items` is a non-Vue-ref shallow ref
  // that doesn't always trigger downstream computeds reliably (incloneution
  // hits the same issue).
  const items = computed<SequencerItem<QueueItemMeta>[]>(() => {
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

  function enqueue(actionId: string, loops = 1): void {
    sequencer.enqueue({ id: actionId, metadata: { loops, loopsLeft: loops } });
  }

  return {
    items,
    current,
    cursor,
    isPaused,
    isHolding,
    manaNeededFromCursor: needed.fromCursor,
    manaNeededTotal: needed.total,
    shouldRestart: sr,
    repeatLastAction: repeat,
    enqueue,
    remove: (index) => {
      sequencer.remove(index);
      queueVersion.value += 1;
    },
    reorder: (from, to) => {
      sequencer.reorder(from, to);
      queueVersion.value += 1;
    },
    clear: () => {
      sequencer.clear();
      queueVersion.value += 1;
    },
    togglePause: () => sequencer.togglePause(),
  };
}

import { computed, inject, type ComputedRef } from 'vue';
import type { Engine, SequencerItem } from 'open-loop-engine';
import { QueueKey, QueueVersionKey, type QueueItemMeta } from '../modules';

export interface QueueView {
  items: ComputedRef<SequencerItem<QueueItemMeta>[]>;
  current: ComputedRef<SequencerItem<QueueItemMeta> | null>;
  isPaused: ComputedRef<boolean>;
  isHolding: ComputedRef<boolean>;
  enqueue(actionId: string, loops?: number): void;
  remove(index: number): void;
  reorder(from: number, to: number): void;
  clear(): void;
  togglePause(): void;
}

export function useQueue(): QueueView {
  const engine = inject<Engine>('engine');
  const seq = engine?.tryInject(QueueKey);
  const ver = engine?.tryInject(QueueVersionKey);
  if (!seq || !ver) {
    throw new Error('useQueue() called outside an active looper engine');
  }
  const sequencer = seq;
  const queueVersion = ver;

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

  const isPaused = computed(() => sequencer.paused.value);
  const isHolding = computed(() => {
    void queueVersion.value;
    return sequencer.holding;
  });

  function enqueue(actionId: string, loops = 1): void {
    sequencer.enqueue({ id: actionId, metadata: { loops, remaining: loops } });
  }

  return {
    items,
    current,
    isPaused,
    isHolding,
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

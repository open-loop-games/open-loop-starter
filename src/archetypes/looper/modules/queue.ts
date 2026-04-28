import { ref, type Ref } from 'vue';
import {
  Decimal,
  createSequencer,
  type EngineModule,
  type InjectionKey,
  type Sequencer,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { ActionsKey } from './actions';
import { ManaKey } from './mana';
import { ZonesKey } from './zones';

/** Per-queue-item metadata. `loops` is the per-item repeat count (idle-loops-style). */
export interface QueueItemMeta {
  loops: number;
  /** Remaining iterations on the current dispatch. Decrements each completion. */
  remaining: number;
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
 * Single-queue sequencer (NOT the dual edit/active idle-loops-ng split — that
 * one's a Lloyd-mod-era UX feature, fork-extension). The dispatcher gates on
 * mana-affordability + zone-unlock state via `canRun`'s tri-state shape:
 *
 *   - 'never' — action's zone isn't unlocked (probably an old queue entry
 *     against deleted content); skip entirely
 *   - 'notNow' — zone unlocked but mana insufficient (paused / waiting for
 *     reset); hold the slot until either resolves
 *   - 'now' — dispatch
 *
 * Per-tick: the dispatcher calls `actions.tick(currentId, dt)`. On completion
 * it decrements `remaining` and either calls `sequencer.complete()` (popping
 * the item) when `remaining` reaches 0, or re-dispatches the same id by
 * keeping it as `current` and resetting progress (already done by
 * `actions.tick` on completion).
 */
export function createQueueModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/queue',
    dependencies: ['looper/actions', 'looper/zones', 'looper/mana'],
    install(ctx) {
      const actions = ctx.inject(ActionsKey);
      const zones = ctx.inject(ZonesKey);
      const mana = ctx.inject(ManaKey);

      const queueVersion = ref(0);

      const sequencer = createSequencer<QueueItemMeta>({
        id: 'looper/queue',
        mode: 'queue',
        canRun: (item) => {
          const def = actions.getDef(item.id);
          if (!def) return 'never';
          if (!zones.isUnlocked(def.zoneId)) return 'never';
          if (Decimal.lte(mana.value, 0)) return 'notNow';
          return 'now';
        },
        registerTick: ctx.onTick,
      });

      // Per-tick: advance the current action's progress. On completion,
      // decrement the item's remaining iterations; pop when exhausted.
      ctx.onTick((dt: number) => {
        const item = sequencer.currentItem;
        if (!item) return;
        if (Decimal.lte(mana.value, 0)) return;

        const completed = actions.tick(item.id, dt);
        if (!completed) return;

        item.metadata.remaining = Math.max(0, (item.metadata.remaining ?? 1) - 1);
        if (item.metadata.remaining <= 0) {
          sequencer.complete();
          queueVersion.value += 1;
        }
        // If remaining > 0, the item stays current and ticks again next dt.
      });

      sequencer.on('enqueue', () => {
        queueVersion.value += 1;
      });
      sequencer.on('skip', () => {
        queueVersion.value += 1;
      });

      ctx.provide(QueueKey, sequencer);
      ctx.provide(QueueVersionKey, queueVersion);
    },
  };
}

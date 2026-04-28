import { computed, inject, type ComputedRef, type Ref } from 'vue';
import type { Engine } from 'open-loop-engine';
import { LoopKey } from '../modules';

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

export interface LoopView {
  /** Sim-seconds elapsed in the current loop. */
  elapsed: Ref<number>;
  /** Total completed loops (persistent). */
  count: ComputedRef<number>;
  /** Fastest loop completion in seconds (Infinity until first loop). */
  bestTime: ComputedRef<number>;
  /** Whether the loop is actively ticking. */
  running: Ref<boolean>;
  /** Manually trigger the restart sequence (mana exhaustion path). */
  end(): boolean;
  run(): void;
  pause(): void;
}

export function useLoop(): LoopView {
  const engine = inject<Engine>('engine');
  const loop = engine?.tryInject(LoopKey);
  if (!loop) {
    throw new Error('useLoop() called outside an active looper engine');
  }

  return {
    elapsed: asRef(loop.elapsed),
    count: computed(() => loop.count.value),
    bestTime: computed(() => loop.bestTime.value),
    running: asRef(loop.running),
    end: () => loop.end(),
    run: () => loop.run(),
    pause: () => loop.pause(),
  };
}

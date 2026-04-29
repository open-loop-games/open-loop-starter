import { computed } from 'vue';
import type { ComputedRef, EngineRef } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { LoopKey } from '../modules';

export interface LoopView {
  /** Sim-seconds elapsed in the current loop. */
  elapsed: EngineRef<number>;
  /** Total completed loops (persistent). */
  count: ComputedRef<number>;
  /** Fastest loop completion in seconds (Infinity until first loop). */
  bestTime: ComputedRef<number>;
  /** Whether the loop is actively ticking. */
  running: EngineRef<boolean>;
  /** Manually trigger the restart sequence (mana exhaustion path). */
  end(): boolean;
  run(): void;
  pause(): void;
}

export function useLoop(): LoopView {
  const loop = useModule(LoopKey);

  return {
    elapsed: loop.elapsed,
    count: computed(() => loop.count.value),
    bestTime: computed(() => loop.bestTime.value),
    running: loop.running,
    end: () => loop.end(),
    run: () => loop.run(),
    pause: () => loop.pause(),
  };
}

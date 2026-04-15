/**
 * Benchmark Harness — dev-gated perf snapshot mod (OL-427 P3).
 *
 * Not a game. The mod's install() just mounts BenchmarkLayout into the
 * `game-layout` slot; the layout owns the run button and wires `bootMod`
 * into a `runMatrix` cell. Runs CF at stock scale (no content inflators
 * in this phase — inflation is a separate card after this shell lands).
 *
 * Second consumer of `src/test/bootMod.ts` alongside the vitest accessor
 * pack. Dev-picker-gated in `src/modules/index.ts` via `import.meta.env.DEV`.
 */
import type { EngineModule, EngineContext } from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import BenchmarkLayout from '@/ui/layouts/BenchmarkLayout.vue';

export const benchmarkModule: EngineModule = {
  id: 'benchmark',
  dependencies: ['settings', 'ui-registry'],
  install(_ctx: EngineContext) {
    setSlot('game-layout', BenchmarkLayout);
  },
};

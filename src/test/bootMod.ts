/**
 * Boot a fresh engine with a given module list under an isolated persistence
 * namespace. Returns a handle with step/flush/dispose helpers.
 *
 * Consumers:
 * - vitest tests, wrapped by per-archetype accessor packs (see
 *   `src/test/cookie-factory/accessors.ts`).
 * - The benchmark mod's runtime, which calls `bootMod` inside a `runMatrix`
 *   cell setup to spin up CF-booted engines per seed.
 *
 * Each call allocates a unique persistence namespace, so multiple handles
 * coexist in one process without aliasing persistent-ref contexts or
 * storage keys. The engine exposes no per-namespace ref cleanup, so the
 * `persistentRefs` map grows by one context-set per `bootMod()` call for
 * the lifetime of the process. Acceptable in tests (per-file workers exit)
 * and for occasional benchmark runs; a long-running browser session that
 * kicks the benchmark repeatedly will accumulate refs until reload.
 */
import {
  createEngine,
  createMemoryStorage,
  type Engine,
  type EngineModule,
} from '@open-loop/engine';

export interface BootHandle {
  engine: Engine;
  /** Advance the engine by `n` real ticks. Async to flush queued microtasks. */
  tick(n?: number): Promise<void>;
  /**
   * Step until `condition()` returns true or `maxTicks` is reached. Returns
   * the number of ticks it took. Throws on timeout.
   */
  tickUntil(condition: () => boolean, maxTicks?: number): Promise<number>;
  /** Stop the engine's tick timer. Idempotent. */
  dispose(): void;
}

let bootCounter = 0;

export interface BootModOptions {
  modules: EngineModule[];
  /** Optional prefix for the generated namespace. Useful in debug output. */
  namespacePrefix?: string;
  /** Loop tick rate in Hz. Defaults to 20. */
  tickRate?: number;
}

/**
 * Build a fresh engine, install the given modules, start the loop, and
 * return a handle that drives it. The engine is namespaced so repeated
 * calls in one process don't collide on persistent-ref contexts.
 */
export function bootMod(options: BootModOptions): BootHandle {
  const { modules, namespacePrefix = 'boot', tickRate = 20 } = options;
  const namespace = `${namespacePrefix}-${bootCounter++}`;

  const engine = createEngine({
    gameId: namespace,
    persistence: true,
    persistenceNamespace: namespace,
    storageAdapter: createMemoryStorage(),
    autoSaveInterval: 0,
    tickRate,
  });
  for (const mod of modules) engine.use(mod);
  engine.start();

  let stopped = false;
  const dispose = (): void => {
    if (stopped) return;
    stopped = true;
    engine.stop();
  };

  const tick = async (n = 1): Promise<void> => {
    for (let i = 0; i < n; i++) {
      engine.loop.stepOnce();
      await Promise.resolve();
    }
  };

  const tickUntil = async (condition: () => boolean, maxTicks = 50_000): Promise<number> => {
    for (let i = 0; i < maxTicks; i++) {
      if (condition()) return i;
      engine.loop.stepOnce();
      await Promise.resolve();
    }
    throw new Error(`tickUntil timed out after ${maxTicks} ticks`);
  };

  return { engine, tick, tickUntil, dispose };
}

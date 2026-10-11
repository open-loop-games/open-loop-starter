/**
 * Boot a fresh engine with a given module list under an isolated persistence
 * namespace, on memory storage, and hand back a handle that steps it. The
 * primitive under every behavioral test: game code asserts observable behavior
 * by driving the real assembled engine tick-by-tick, rather than mocking it.
 *
 * Named for what it does — boots an *engine* from a module list — not "mod":
 * "mod" is the engine's own selectable-game concept (`ModDef` / `selectMod`),
 * which this has nothing to do with.
 *
 * Consumers wrap this per game in a bare `boot()`/`tick()` harness (see the
 * `sim/harness.ts` an eject leaves in `src/game/sim/`), which hardcodes the
 * game's module list so tests read `boot(); forkSpread(); await tick(10)`.
 *
 * Each call allocates a unique persistence namespace, so multiple handles
 * coexist in one process without aliasing persistent-ref contexts or storage
 * keys — that isolation is what makes fresh-boot-per-test (`beforeEach(boot)`)
 * safe: a re-install would otherwise collide on process-global persistent ids.
 * The engine exposes no per-namespace ref cleanup, so the `persistentRefs` map
 * grows by one context-set per call for the process lifetime. Acceptable in
 * tests (per-file workers exit); mind it in any long-running repeated-boot loop.
 */
import {
  createEngine,
  createMemoryStorage,
  seedRNG,
  type Engine,
  type EngineModule,
} from '@open-loop/engine';

export interface TestEngineHandle {
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

export interface BootTestEngineOptions {
  modules: EngineModule[];
  /** Optional prefix for the generated namespace. Useful in debug output. */
  namespacePrefix?: string;
  /** Intervals per second, the engine's `intervalRate`. Defaults to 20. */
  intervalRate?: number;
  /**
   * Seed for the engine's module-global RNG, applied before the modules
   * install. Defaults to 0: the engine otherwise starts that stream from
   * entropy, and a behavioral run would draw differently every time.
   */
  seed?: number;
}

/**
 * Build a fresh engine, install the given modules, run its install/onStart
 * wiring, and return a handle that drives it deterministically. The engine is
 * namespaced so repeated calls in one process don't collide on persistent-ref
 * contexts.
 */
export function bootTestEngine(options: BootTestEngineOptions): TestEngineHandle {
  const { modules, namespacePrefix = 'boot', intervalRate = 20, seed = 0 } = options;
  const namespace = `${namespacePrefix}-${bootCounter++}`;
  seedRNG(seed);

  const engine = createEngine({
    gameId: namespace,
    persistence: true,
    persistenceNamespace: namespace,
    storageAdapter: createMemoryStorage(),
    autoSaveInterval: 0,
    intervalRate,
  });
  for (const mod of modules) engine.use(mod);
  // start() runs install/onStart wiring; stop() immediately hands the clock to
  // tickOnce() so the real-time loop can't advance time between assertions —
  // tests own the tick. tickOnce() is manual and works whether or not the loop
  // is running.
  engine.start();
  engine.stop();

  let stopped = true;
  const dispose = (): void => {
    if (stopped) return;
    stopped = true;
    engine.stop();
  };

  const tick = async (n = 1): Promise<void> => {
    for (let i = 0; i < n; i++) {
      engine.tickDriver.tickOnce();
      await Promise.resolve();
    }
  };

  const tickUntil = async (condition: () => boolean, maxTicks = 50_000): Promise<number> => {
    for (let i = 0; i < maxTicks; i++) {
      if (condition()) return i;
      engine.tickDriver.tickOnce();
      await Promise.resolve();
    }
    throw new Error(`tickUntil timed out after ${maxTicks} ticks`);
  };

  return { engine, tick, tickUntil, dispose };
}

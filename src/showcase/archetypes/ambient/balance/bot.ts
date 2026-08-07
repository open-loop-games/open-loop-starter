import {
  bn,
  persistent,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
} from '@open-loop/engine';
import { createAmbientEngine } from '..';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  getAutoProducers,
  getPrimaryResource,
} from '../modules';

/**
 * Zero-click activity model. Ambient's identity is "auto-production runs
 * without input." The bot fires zero clicks at all sim-times; this function
 * is here for symmetry with Producer's `expectedClicksAt` and to make the
 * contract explicit.
 *
 * If a fork later adds a click affordance, this becomes the Ambient-side
 * taper. Until then, returning 0 documents the deliberate absence.
 */
function expectedInputAt(_simTimeSec: number): number {
  return 0;
}

let engineCounter = 0;

/**
 * Bot behavior as an EngineModule. Installing the bot through the engine's
 * module system (rather than as post-`start()` wiring) lets its persistent
 * accumulators live inside the engine's namespace so
 * `saveManager.exportSave / importSave` reach them — load-bearing for the
 * solver's build-once + importSave-per-iteration flow.
 *
 * Auto-purchase scope:
 *   - Producers: installed by the canonical autobuyer under
 *     `modules/autobuyers/auto-producers.ts`. The bot enables every spec at
 *     sim-start; unlock predicates remain real.
 *   - Unlocks: auto-fire on threshold cross via `modules/unlocks.ts`'s own
 *     `setupSweepAutoPurchase` install. Deliberately not registered under
 *     the autobuyer master — visibility soft-reveals are unconditional per
 *     the Ambient no-pressure contract.
 *   - Scene-variants: derived from unlocks via `modules/scene.ts`'s watch
 *     bridge — also independent of the bot.
 *
 * Click activation slot is preserved (zero today via `expectedInputAt`) so
 * a future fork wiring a click taper drops in cleanly.
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['ambient/auto-producers', 'ambient/autobuyers'],
    install() {
      const inputsFired = persistent<number>(0, { name: 'inputsFired' });
      void inputsFired;
    },
  };
}

/**
 * Build a started, sim-bot-driven engine for the Ambient archetype.
 *
 * Wires:
 * - Zero-click contract (no clicks fired by `expectedInputAt`).
 * - Producer auto-buy via the canonical autobuyer registry. Master toggle
 *   flipped on; every registered spec's `isActive` forced true.
 * - Unlocks auto-fire on threshold cross via `modules/unlocks.ts` itself,
 *   independent of the autobuyer master toggle (per Ambient contract).
 *
 * Caller drives the engine via `runUntil` from the engine harness. The
 * engine is `start()`ed and immediately `stop()`ped so the real-time
 * interval doesn't fire — solver iterations advance via
 * `engine.tickDriver.simulateTick(tickDelta)` from `runUntil`.
 *
 * Each build gets a unique `persistenceNamespace` so parallel instances
 * (e.g. matrix-probe seeds, future runMatrix-driven sweeps) don't collide
 * in storage.
 */
export function buildAmbientSimEngine(options?: { maxDeltaTime?: number }): Engine {
  const namespace = `balance-${++engineCounter}`;
  const { engine } = createAmbientEngine({
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('cozy-farm');
  engine.start();
  engine.stop();

  const master = engine.tryInject(AutobuyerMasterToggleKey);
  const registry = engine.tryInject(AutobuyerRegistryKey);
  if (!master || !registry) {
    throw new Error('ambient/balance/bot: autobuyer registry not provided');
  }
  master.value = true;
  for (const ab of registry) {
    ab.isActive.value = true;
  }

  return engine;
}

export { expectedInputAt };

/**
 * Accessor for `runUntil({mode: 'stasis-aware-tick'})`. Reports the primary
 * resource's current value + cumulative auto-producer rate keyed by
 * resource id `'sprouts'`. Ambient has no click channel — all income flows
 * through `ProducerCategory.getTotalRate`, so `getRate` faithfully captures
 * what the engine simulates each tick. An economy with an out-of-band rate
 * channel — click taper, externally driven event — cannot use this mode: its
 * accessor under-reports income and the run terminates on a false stasis. See
 * `../BALANCING.md` § Couplings.
 */
export function buildAmbientAccessor(_engine: Engine): GameStateAccessor {
  const sprouts = getPrimaryResource();
  const producers = getAutoProducers();
  return {
    getResource: (id: string) => (id === 'sprouts' ? bn(sprouts.value as DecimalSource) : bn(0)),
    getRate: (id: string) =>
      id === 'sprouts' ? bn(producers.getTotalRate(sprouts) as DecimalSource) : bn(0),
    isUnlocked: () => false,
    getState: () => undefined,
  };
}

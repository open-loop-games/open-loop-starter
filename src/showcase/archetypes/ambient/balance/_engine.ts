/**
 * Sim-engine fixture for the balance probes. Underscore-prefixed because it is
 * not runnable on its own — `solve-probe.ts`, `invariant-probe.ts` and
 * `reveal-probe.ts` import it.
 *
 * It holds **no automation policy**. Ambient's automation is shipping game code
 * (`modules/autobuyers/`), gated by `modules/automation.ts`; what lives here is
 * the engine build, the activation module that switches those shipping
 * autobuyers on for a headless run, the zero-click activity model, and the
 * accessor the solver reads the arc through.
 *
 * `sim/harness.ts` is a different thing — it boots the module list on memory
 * storage for tick-by-tick behavioral specs.
 */

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
 * without input." The sim fires zero clicks at all sim-times; this function
 * exists to make that contract explicit rather than implicit in its absence.
 *
 * If a fork later adds a click affordance, this becomes the Ambient-side
 * taper. Until then, returning 0 documents the deliberate absence.
 */
function expectedInputAt(_simTimeSec: number): number {
  return 0;
}

let engineCounter = 0;

/**
 * Sim activation as an EngineModule — it switches the shipping autobuyers on
 * for a headless run and decides nothing. Installing it through the engine's
 * module system (rather than as post-`start()` wiring) lets its persistent
 * accumulators live inside the engine's namespace so
 * `saveManager.exportSave / importSave` reach them — load-bearing for the
 * solver's build-once + importSave-per-iteration flow.
 *
 * Auto-purchase scope:
 *   - Producers: installed by the canonical autobuyer under
 *     `modules/autobuyers/auto-producers.ts`. This enables every spec at
 *     sim-start; unlock predicates and the tier gate remain real.
 *   - Unlocks: auto-fire on threshold cross via `modules/unlocks.ts`'s own
 *     `setupSweepAutoPurchase` install. Deliberately not registered under
 *     the autobuyer master — visibility soft-reveals are unconditional per
 *     the Ambient no-pressure contract.
 *   - Scene-variants: derived from unlocks via `modules/scene.ts`'s watch
 *     bridge — also independent of this module.
 *
 * Click activation slot is preserved (zero today via `expectedInputAt`) so
 * a future fork wiring a click taper drops in cleanly.
 */
function createSimActivationModule(): EngineModule {
  return {
    id: 'balance-sim-activation',
    dependencies: ['ambient/auto-producers', 'ambient/autobuyers'],
    install() {
      // Reserved slot, deliberately inert: `expectedInputAt` returns 0, so
      // nothing writes this yet. It exists so a fork adding a click taper has
      // a counter already inside the engine's persistence namespace, which is
      // what `exportSave`/`importSave` reach. Delete both together if the
      // zero-click contract ever becomes permanent.
      const inputsFired = persistent<number>(0, { name: 'inputsFired' });
      void inputsFired;
    },
  };
}

/**
 * Build a started, sim-driven engine for the Ambient archetype.
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
    extraModules: [createSimActivationModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('cozy-farm');
  engine.start();
  engine.stop();

  const master = engine.tryInject(AutobuyerMasterToggleKey);
  const registry = engine.tryInject(AutobuyerRegistryKey);
  if (!master || !registry) {
    throw new Error('ambient/balance/_engine: autobuyer registry not provided');
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

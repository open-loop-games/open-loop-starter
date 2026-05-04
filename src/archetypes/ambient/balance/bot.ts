import {
  persistent,
  selectionHybridPayback,
  setupPolicyAutoPurchase,
  type Engine,
  type EngineModule,
} from 'open-loop-engine';
import { createAmbientEngine, getAutoProducers, type AmbientOverrides } from '..';

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
 *   - Producers: wired here via `setupPolicyAutoPurchase` with
 *     `selectionHybridPayback` (1s interval — matches Producer's bot policy
 *     defaults).
 *   - Unlocks: already auto-purchased by `modules/unlocks.ts` itself
 *     (`setupSweepAutoPurchase` in the install path) — soft reveals fire on
 *     threshold cross independently of the bot.
 *   - Scene-variants: derived from unlocks via `modules/scene.ts`'s watch
 *     bridge — also independent of the bot.
 *
 * The bot only needs to drive producer purchases.
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['ambient/auto-producers'],
    install(ctx) {
      const buildings = getAutoProducers();

      // Persistent accumulators live inside the engine namespace so
      // `importSave` resets them alongside game state. Even though
      // `expectedInputAt` returns zero today, the persistent ref is here
      // so a future fork wiring a click taper drops in cleanly.
      const inputsFired = persistent<number>(0, { name: 'inputsFired' });
      void inputsFired;

      setupPolicyAutoPurchase(
        buildings,
        {
          enabled: true,
          interval: 1,
          policy: selectionHybridPayback({
            getCost: (p) => p.repeatable!.getCost(1),
            getRate: (p) => p.computedRate.value,
            getResource: (p) => p.resource.value,
            getReserve: () => 0,
            getHeadlineRate: (p) => buildings.getTotalRate(p.resource),
          }),
        },
        ctx.onTick,
      );
    },
  };
}

/**
 * Build a started, sim-bot-driven engine for the Ambient archetype.
 *
 * Wires:
 * - Zero-click contract (no clicks fired by `expectedInputAt`).
 * - `setupPolicyAutoPurchase` with `selectionHybridPayback`, interval 1s.
 * - Unlocks auto-fire on threshold cross via `modules/unlocks.ts` itself.
 *
 * Caller drives the engine via `runUntil` from the engine harness. The
 * engine is `start()`ed and immediately `stop()`ped so the real-time
 * interval doesn't fire — solver iterations advance via
 * `engine.loop.simulateTick(tickDelta)` from `runUntil`.
 *
 * Each build gets a unique `persistenceNamespace` so parallel instances
 * (e.g. matrix-probe seeds, future runMatrix-driven sweeps) don't collide
 * in storage.
 */
export function buildAmbientSimEngine(
  overrides?: AmbientOverrides,
  options?: { maxDeltaTime?: number },
): Engine {
  const namespace = `balance-${++engineCounter}`;
  const { engine } = createAmbientEngine(overrides, {
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('cozy-farm');
  engine.start();
  engine.stop();
  return engine;
}

export { expectedInputAt };

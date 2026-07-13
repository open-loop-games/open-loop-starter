import {
  bn,
  persistent,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
} from '@open-loop/engine';
import { createProducerEngine, getBuildings, getPrimaryResource, type ProducerOverrides } from '..';
import { AutobuyerMasterToggleKey, AutobuyerRegistryKey } from '../modules';

/**
 * Click activity model. The previous bot did 20 clicks/s for 5s flat then
 * stopped — a delta function that warped beat 2 (cursor cost 15 was payable
 * after second 1, blowing the 60–180s window). Real players taper: a brief
 * burst while learning the click affordance, then occasional clicks while
 * skimming producer rows, then fully passive.
 *
 * Cumulative click count over time is the integral of these rates:
 * - `[0, 30s)` at 1/s → 30 clicks
 * - `[30s, 120s)` at 0.2/s → 18 clicks
 * - `[120s, ∞)` → 0
 *
 * Total ≈ 48 clicks. With clickBaseValue=1, click contributes ~48 cookies
 * by the 2 minute mark — enough to seed the cursor but small relative to
 * even tier-1 production within the first 5 minutes.
 */
function expectedClicksAt(simTimeSec: number): number {
  if (simTimeSec <= 0) return 0;
  if (simTimeSec <= 30) return Math.floor(simTimeSec);
  if (simTimeSec <= 120) return 30 + Math.floor((simTimeSec - 30) * 0.2);
  return 48;
}

// The producer selection policy is shipping code — it lives in
// `modules/autobuyers/producers.ts` as `buildProducerPolicy` and drives both the
// autobuyer and the closed-form walker (`predict.ts`). The balance bot no longer
// carries its own copy; there is one policy, and the harness drives it.

let engineCounter = 0;

/**
 * Bot behavior as an EngineModule. Installing the bot through the engine's
 * module system (rather than as post-`start()` wiring) lets its persistent
 * accumulators live inside the engine's namespace so
 * `saveManager.exportSave` / `importSave` reach them — load-bearing for the
 * balance solver's build-once + importSave-per-iteration flow.
 *
 * Auto-purchase scope:
 *   - Producers + upgrades: installed by the canonical autobuyers under
 *     `modules/autobuyers/`. The bot enables every spec at sim-start; unlock
 *     gates remain real (currently `() => true` for producer's single-tier
 *     economy).
 *   - Click activation: bot-only. Models player click cadence via
 *     `expectedClicksAt`'s taper — not promoted to canonical content because
 *     it represents player behavior, not a player-facing automation.
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['producer/producers', 'producer/autobuyers'],
    install(ctx) {
      const buildings = getBuildings();
      const clickState = buildings.getState('click');
      if (!clickState) throw new Error('balance-bot: click producer state missing');

      // Accumulators live in persistent refs so `importSave(initialBlob)`
      // resets them alongside game state. Under build-once-reuse (the
      // solver flow), the bot module installs once but many probe
      // iterations run against the same engine; closure-local `let` state
      // would leak across iterations silently.
      const simTime = persistent<number>(0, { name: 'simTime' });
      const clicksFired = persistent<number>(0, { name: 'clicksFired' });

      ctx.onTick((dt: number) => {
        simTime.value += dt;
        const target = expectedClicksAt(simTime.value);
        while (clicksFired.value < target) {
          clickState.activate();
          clicksFired.value++;
        }
      });
    },
  };
}

/**
 * Accessor for `runProbe({mode: 'event'})` benches and anything that drives the
 * content walker over a Producer engine. Keyed by `resource.id`.
 * Lives here so the solver and the event-driven bench share one shape.
 */
export function buildProducerAccessor(_engine: Engine): GameStateAccessor {
  const cookies = getPrimaryResource();
  const buildings = getBuildings();
  return {
    getResource: (id: string) => (id === 'cookies' ? bn(cookies.value as DecimalSource) : bn(0)),
    getRate: (id: string) =>
      id === 'cookies' ? bn(buildings.getTotalRate(cookies) as DecimalSource) : bn(0),
    isUnlocked: () => false,
    getState: () => undefined,
  };
}

/**
 * Build a started, sim-bot-driven engine for the Producer archetype.
 *
 * Wires:
 * - Click taper per `expectedClicksAt` (bot-only — models player click cadence).
 * - Producer + upgrade auto-buy via the canonical autobuyer registry.
 *   Master toggle is flipped on; every registered autobuyer's `isActive`
 *   is forced true. Unlock predicates remain real, so the sim respects
 *   any gating those autobuyers carry.
 *
 * Caller drives the engine via `runUntil` / `runMatrixUntil` (which call
 * `engine.tickDriver.stepOnce()` internally). The engine has been `start()`ed
 * and immediately `stop()`ped so the real-time interval doesn't fire.
 *
 * `maxDeltaTime` override is for `runProbe({mode: 'event'})` benches —
 * keep the option narrow until the probe adoption decision lands.
 */
export function buildProducerSimEngine(
  overrides?: ProducerOverrides,
  options?: { maxDeltaTime?: number },
): Engine {
  const namespace = `balance-${++engineCounter}`;
  const { engine } = createProducerEngine(overrides, {
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('bakery');
  engine.start();
  engine.stop();

  const master = engine.tryInject(AutobuyerMasterToggleKey);
  const registry = engine.tryInject(AutobuyerRegistryKey);
  if (!master || !registry) {
    throw new Error('producer/balance/bot: autobuyer registry not provided');
  }
  master.value = true;
  for (const ab of registry) {
    ab.isActive.value = true;
  }

  return engine;
}

export { expectedClicksAt };

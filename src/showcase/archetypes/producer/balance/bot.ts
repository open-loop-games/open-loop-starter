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
 * Click activity model — a human active-clicking phase followed by a sustained
 * autoclicker.
 *
 * For the opening `HUMAN_CLICK_WINDOW` the player clicks the big cookie by hand
 * at a realistic human cadence (`HUMAN_CLICK_RATE`, ~10–12/s sustained during
 * active play). Past that the player sets up an autoclicker (holds the mouse or
 * runs a clicker mod) at the faster `AUTOCLICK_RATE`.
 *
 * Sustained clicking keeps the click producer economically live across the
 * whole arc — its per-click value climbs with the cursor tier upgrades (each
 * ×2, targeting `['click','cursor']`) and thousand-fingers, so the click stream
 * is a real secondary income lane, not dead weight after the opening.
 *
 * Cumulative click count is the integral of these rates:
 * - `[0, HUMAN_CLICK_WINDOW)` at HUMAN_CLICK_RATE/s
 * - `[HUMAN_CLICK_WINDOW, ∞)` at AUTOCLICK_RATE/s
 */
const HUMAN_CLICK_RATE = 11;
const HUMAN_CLICK_WINDOW = 180;
const AUTOCLICK_RATE = 30;

function expectedClicksAt(simTimeSec: number): number {
  if (simTimeSec <= 0) return 0;
  if (simTimeSec <= HUMAN_CLICK_WINDOW) return Math.floor(simTimeSec * HUMAN_CLICK_RATE);
  const humanClicks = HUMAN_CLICK_WINDOW * HUMAN_CLICK_RATE;
  return humanClicks + Math.floor((simTimeSec - HUMAN_CLICK_WINDOW) * AUTOCLICK_RATE);
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

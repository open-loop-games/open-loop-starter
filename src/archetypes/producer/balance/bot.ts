import {
  bn,
  persistent,
  selectionHybridPayback,
  setupPolicyAutoPurchase,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
} from 'open-loop-engine';
import {
  createProducerEngine,
  getBuildings,
  getPrimaryResource,
  getUpgrades,
  type ProducerOverrides,
} from '..';

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

let engineCounter = 0;

/**
 * Bot behaviour as an EngineModule. Installing the bot through the engine's
 * module system (rather than as post-`start()` wiring) lets its persistent
 * accumulators live inside the engine's namespace so
 * `saveManager.exportSave` / `importSave` reach them — load-bearing for the
 * balance solver's build-once + importSave-per-iteration flow.
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = getBuildings();
      const upgrades = getUpgrades();
      const clickState = buildings.getState('click');
      if (!clickState) throw new Error('balance-bot: click producer state missing');

      // Accumulators live in persistent refs so `importSave(initialBlob)`
      // resets them alongside game state. Under build-once-reuse (the
      // solver flow), the bot module installs once but many probe
      // iterations run against the same engine; closure-local `let` state
      // would leak across iterations silently.
      const simTime = persistent<number>(0, { name: 'simTime' });
      const clicksFired = persistent<number>(0, { name: 'clicksFired' });
      const upgradeAccum = persistent<number>(0, { name: 'upgradeAccum' });

      // TODO(expansion): click-taper is a TimedInput — expectedClicksAt is
      // a pure (simTime) → cumulativeCount the bot differences per tick.
      // See open-loop-engine/docs/candidate-primitives.md § TimedInput.
      // Graduates when a second archetype's balance bot hits the same
      // shape.
      ctx.onTick((dt: number) => {
        simTime.value += dt;
        const target = expectedClicksAt(simTime.value);
        while (clicksFired.value < target) {
          clickState.activate();
          clicksFired.value++;
        }
      });

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

      const upgradeInterval = 2;
      ctx.onTick((dt: number) => {
        upgradeAccum.value += dt;
        // Drain-while-≥-interval: each drained slot runs an "affordable
        // sweep." Matches the engine-side setupPolicyAutoPurchase drain
        // semantics so coarse-dt probes (dt > interval) see N passes
        // instead of 1. Without this, a `dt = 3×interval` advance would
        // fire one sweep and discard the remainder — correct at
        // tickDelta=1s today, broken under coarseFineProbe with large dt.
        while (upgradeAccum.value >= upgradeInterval) {
          for (const p of upgrades.getAffordable()) {
            p.purchase();
          }
          upgradeAccum.value -= upgradeInterval;
        }
      });
    },
  };
}

/**
 * Accessor for `eventDrivenProbe` benches and anything that drives the
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
 * - Click taper per `expectedClicksAt`.
 * - `setupPolicyAutoPurchase` with `selectionHybridPayback`, interval 1s.
 * - Auto-buy every affordable upgrade every 2s.
 *
 * Caller drives the engine via `runUntil` / `runMatrixUntil` (which call
 * `engine.loop.stepOnce()` internally). The engine has been `start()`ed
 * and immediately `stop()`ped so the real-time interval doesn't fire.
 *
 * `maxDeltaTime` override is for `eventDrivenProbe` benches —
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
  return engine;
}

export { expectedClicksAt };

import { setupAutoPurchaseProducers, type Engine } from 'open-loop-engine';
import {
  BuildingsKey,
  ClickStateKey,
  UpgradesKey,
  createProducerEngine,
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
 * Build a started, sim-bot-driven engine for the Producer archetype.
 *
 * Wires:
 * - Click taper per `expectedClicksAt`.
 * - `setupAutoPurchaseProducers` on payback-period policy, interval 1s.
 * - Auto-buy every affordable upgrade every 2s.
 *
 * Caller drives the engine via `runUntil` / `runMatrixUntil` (which call
 * `engine.loop.stepOnce()` internally). The engine has been `start()`ed
 * and immediately `stop()`ped so the real-time interval doesn't fire.
 */
export function buildProducerSimEngine(overrides?: ProducerOverrides): Engine {
  const namespace = `balance-${++engineCounter}`;
  const { engine } = createProducerEngine(overrides, { persistenceNamespace: namespace });
  engine.selectMod('bakery');
  engine.start();
  engine.stop();

  const clickState = engine.tryInject(ClickStateKey)!;
  const buildings = engine.tryInject(BuildingsKey)!;
  const upgrades = engine.tryInject(UpgradesKey)!;

  // TODO(expansion): click-taper is a TimedInput — expectedClicksAt is a
  // pure (simTime) → cumulativeCount the bot differences per tick. See
  // open-loop-engine/docs/candidate-primitives.md § TimedInput. Graduates
  // when a second archetype's balance bot hits the same shape.
  let clicksFired = 0;
  engine.loop.onTick(() => {
    const target = expectedClicksAt(clickState.elapsedSec.value);
    while (clicksFired < target) {
      clickState.click();
      clicksFired++;
    }
  });

  setupAutoPurchaseProducers(
    buildings,
    { enabled: true, interval: 1, policy: 'hybrid-payback' },
    (cb) => engine.loop.onTick(cb),
  );

  let upgradeAccum = 0;
  const upgradeInterval = 2;
  engine.loop.onTick((dt: number) => {
    upgradeAccum += dt;
    // Drain-while-≥-interval: each drained slot runs an "affordable sweep."
    // Matches the engine-side setupAutoPurchaseProducers drain semantics so
    // coarse-dt probes (dt > interval) see N passes instead of 1. Without
    // this, a `dt = 3×interval` advance would fire one sweep and discard
    // the remainder — correct at tickDelta=1s today, broken under OL-633's
    // coarseFineProbe.
    while (upgradeAccum >= upgradeInterval) {
      for (const p of upgrades.getAffordable()) {
        p.purchase();
      }
      upgradeAccum -= upgradeInterval;
    }
  });

  return engine;
}

export { expectedClicksAt };

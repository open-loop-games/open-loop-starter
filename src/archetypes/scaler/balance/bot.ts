import { bn, type DecimalSource, type Engine, type GameStateAccessor } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import { getCoinResource, getCoinProducers, getAutoEnabled, getAutobuyerToggles } from '../modules';

let engineCounter = 0;

/**
 * Build a started, autobuyer-driven engine for the Scaler archetype.
 *
 * Wires:
 * - Zero-click contract — scaler has no click affordance; all income flows
 *   through autobuyer-driven `Producer.getTotalRate(coins)` from the
 *   continuous coin producers. Mirrors ambient's stasis-aware-tick
 *   adoption condition.
 * - Autobuyer master toggle + every per-system toggle on (default state).
 *   Scaler's autobuyers are installed by `scaler-autobuyers` module and
 *   default `true` for the master + per-system; spinning the engine up is
 *   enough to put them in motion.
 *
 * Caller drives the engine via `runUntil` from the engine harness. The
 * engine is `start()`ed and immediately `stop()`ped so the real-time
 * interval doesn't fire — solver iterations advance via
 * `engine.loop.simulateTick(tickDelta)` from `runUntil`.
 *
 * Each build gets a unique `persistenceNamespace` so parallel instances
 * (matrix-probe seeds, sweeps) don't collide in storage.
 */
export function buildScalerSimEngine(options?: { maxDeltaTime?: number }): Engine {
  const namespace = `balance-${++engineCounter}-${Date.now()}`;
  const { engine } = createScalerEngine({
    persistenceNamespace: namespace,
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();
  engine.stop();

  // Defensive ensure — scaler defaults to all autobuyers on, but if a future
  // change flips defaults the simulator should still drive the canonical
  // arc. Mirror the ambient pattern: master + all per-system toggles on.
  const master = getAutoEnabled();
  const toggles = getAutobuyerToggles();
  master.value = true;
  toggles.coinProducers.value = true;
  toggles.acceleratorMultiplier.value = true;
  toggles.coinUpgrades.value = true;
  toggles.prestige.value = true;
  toggles.diamondProducers.value = true;
  toggles.prestigeUpgrades.value = true;
  toggles.crystalUpgrades.value = true;
  toggles.autoSacrifice.value = true;
  toggles.transcend.value = true;
  toggles.mythosProducers.value = true;
  toggles.transcendUpgrades.value = true;
  toggles.acceleratorBoost.value = true;
  toggles.challengeSweep.value = true;

  return engine;
}

/**
 * Accessor for `runUntil({mode: 'stasis-aware-tick'})`. Reports coin rate
 * via `getCoinProducers().getTotalRate(coins)` — scaler's autobuyer-driven
 * income surfaces exclusively through the producer-category tick (no click
 * channel, no out-of-band rate). This is the N=2 confirmation of the
 * adoption condition documented in `BALANCING-ambient.md`:
 *   "An accessor faithfully captures the engine's income channels iff
 *    there is no out-of-band rate channel."
 *
 * Producer was the wedge (click-taper invisible to `getRate`); ambient
 * was the first clean adoption (zero-click); scaler is the second clean
 * adoption (zero-click + multi-tier autobuyer-driven).
 *
 * Reads beyond coins (`prestige-points`, `transcend-points`, etc.) return
 * 0 — those resources only change via discrete conversion events, not
 * continuous rate. Stasis-aware checks for those predicates rely on the
 * upstream coin rate driving the cycle.
 */
export function buildScalerAccessor(_engine: Engine): GameStateAccessor {
  const coins = getCoinResource();
  const coinProducers = getCoinProducers();
  return {
    getResource: (id: string) => (id === 'coins' ? bn(coins.value as DecimalSource) : bn(0)),
    getRate: (id: string) =>
      id === 'coins' ? bn(coinProducers.getTotalRate(coins) as DecimalSource) : bn(0),
    isUnlocked: () => false,
    getState: () => undefined,
  };
}

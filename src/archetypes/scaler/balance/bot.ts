import type { Engine } from 'open-loop-engine';
import { createScalerEngine } from '..';
import { AutobuyerMasterToggleKey, AutobuyerRegistryKey } from '../modules';
import type { PrestigeThresholdConfig } from '../modules/autobuyers/prestige';
import type { ScalerOverrides } from '../data/overrides';
import type { Tier } from '../data/types';

/**
 * Scaler balance bot — thin wrapper over the canonical autobuyer registry.
 *
 * Per OL-854: scaler ships its automation tier as engine modules under
 * `modules/autobuyers/{antimatter,prestige,transcend}.ts`. Each autobuyer
 * registers an `AutobuyerSpec` (unlock predicate, isActive toggle, optional
 * tick body) plus, for the wrapping cases, a `setupPolicyAutoPurchase` /
 * `setupSweepAutoPurchase` install gated through {@link autobuyerGate}.
 *
 * The bot's job is to "pretend the player progressed past every gate" — it
 * flips the master toggle on, then walks the registry and force-enables
 * every autobuyer's `isActive`. Unlock predicates remain real (autobuyers
 * do nothing until the milestone fires) so the sim still respects tier-
 * progression ordering; `isActive: true` just means "the player checked
 * the box."
 *
 * Threshold autobuyers ship with `mode: 'never'` so the player default is
 * inert; the bot flips prestige + transcend threshold modes to `'roi'` so
 * sub-leaf D's solver can bisect ROI_THRESHOLD_SEC against beats 3-5.
 * Leaving `roiPaybackSeconds` unset lets the threshold flow through the
 * scaler tuning registry, where solve.ts pushScope drives it. ECC sweep
 * stays at `'never'` until sub-leaf E.
 *
 * vanilla canonical: AntimatterDimensionsSourceCode/src/core/autobuyers/
 *   autobuyers.js:122-137 (Autobuyers.tick — single sequential walk).
 */

let engineCounter = 0;

/**
 * Build a started, autobuyer-driven engine for the Scaler archetype.
 *
 * Caller drives the engine via `runUntil` / `runMatrixUntil` (which call
 * `engine.loop.stepOnce()` internally). The engine has been `start()`ed
 * and immediately `stop()`ped so the real-time interval doesn't fire.
 */
export function buildScalerSimEngine(
  overrides?: ScalerOverrides,
  options?: { maxDeltaTime?: number },
): Engine {
  const namespace = `balance-${++engineCounter}`;
  const { engine } = createScalerEngine(overrides, {
    persistenceNamespace: namespace,
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('synergism-slim');
  engine.start();
  engine.stop();

  // Enable every autobuyer at sim-start. Unlock gates remain real (bound
  // to `Resource.cumulative` in each tier autobuyer module); they lift
  // naturally as the bot crosses each tier-presence threshold during the
  // arc, the same way a player who flipped every toggle on day one would
  // see them unlock.
  const master = engine.tryInject(AutobuyerMasterToggleKey);
  const registry = engine.tryInject(AutobuyerRegistryKey);
  if (!master || !registry) {
    throw new Error('scaler/balance/bot: autobuyer registry not provided');
  }
  master.value = true;
  for (const ab of registry) {
    ab.isActive.value = true;
    if (ab.id === 'autobuyer/prestige/threshold' || ab.id === 'autobuyer/transcend/threshold') {
      // config is the same object the autobuyer's tick reads from — mutating
      // mode here flips the spec from inert ('never') to ROI-driven without
      // touching the spec definition. roiPaybackSeconds stays undefined so
      // the tunable fallthrough in the tick body lets solve.ts drive the
      // threshold via pushScope.
      const config = ab.config as PrestigeThresholdConfig;
      config.mode = 'roi';
    }
  }

  return engine;
}

export type { Tier };

import {
  persistent,
  selectionHybridPayback,
  setupPolicyAutoPurchase,
  type Engine,
  type EngineContext,
  type EngineModule,
  type Producer,
  type ProducerCategory,
  type SelectionPolicy,
} from 'open-loop-engine';
import { createScalerEngine } from '..';
import { ScalerTiersKey, type ScalerTier } from '../modules/tiers';
import type { ScalerOverrides } from '../data/overrides';
import type { ProducerDef, Tier } from '../data/types';

/**
 * Scaler balance bot. Multi-tier composition is bespoke at this scope —
 * no in-tree precedent (producer is single-category; tug runs strategy
 * matchups; ambient is single-tier resource accumulation). Convergence
 * signal for `candidate-primitives.md` if a second multi-tier-prestige
 * archetype lands the same shape.
 *
 * Per-tier behaviors:
 *   - Continuous-producer auto-buy via `setupPolicyAutoPurchase` × 3 (one
 *     per ScalerTier.producers category). `selectionHybridPayback` is
 *     adopted for each tier; reserve floor 0 (the bot doesn't bank).
 *   - Upgrade auto-buy: every 2s, sweep `tier.upgrades.getAffordable()`.
 *   - **Prestige + Transcend timing: NOT installed at sub-leaf B.**
 *     Sub-leaf D owns the timing rules. Greedy "if canConvert, convert"
 *     is broken on this archetype: prestige `createCostRequirement`'s
 *     `cost: () => coin.value` (modules/prestige.ts) makes `canConvert`
 *     trivially true at any coin value, including 0; a greedy bot fires
 *     every tick and the reset wipes antimatter before any beat lands.
 *     Real timing rule is ROI-aware per BALANCING.md § Theme 3 #5.
 *   - ECC challenge attempts: NOT installed at sub-leaf B. Sub-leaf E
 *     owns the attempt rule (and the `keep:` semantics resolution per
 *     OL-841 open uncertainty).
 *
 * Consequence at sub-leaf B: arc beats 3–8 (which require prestige/
 * transcend to fire) will land "never fired" in `run.ts`'s punch list.
 * That's the expected pre-D/E state. Beats 1–2 (antimatter only) should
 * land within their windows — those are sub-leaf C's calibration target.
 *
 * No clicks — scaler isn't click-paced (per scaler.md § 3 "no
 * `createLoop`, no manual cadence"). The 1e2 coin bootstrap grant
 * (modules/antimatter.ts:82) covers the first Worker cost.
 */

let engineCounter = 0;

/**
 * Hybrid-payback selection policy for a single ScalerTier's producer
 * category. Mirrors producer's `buildBotPolicy` shape — single source of
 * truth shared by `setupPolicyAutoPurchase` install and any future
 * predictor walker. Reserve floor 0; forks introducing a per-tier
 * reserve must extend this signature.
 */
export function buildTierProducerPolicy(
  producers: ProducerCategory<ProducerDef>,
): SelectionPolicy<Producer> {
  return selectionHybridPayback({
    getCost: (p) => p.repeatable!.getCost(1),
    getRate: (p) => p.computedRate.value,
    getResource: (p) => p.resource.value,
    getReserve: () => 0,
    getHeadlineRate: (p) => producers.getTotalRate(p.resource),
  });
}

/**
 * Bot behavior as an EngineModule. Installing through the engine module
 * system (rather than post-`start()` wiring) lets persistent accumulators
 * live inside the engine's namespace so `saveManager.exportSave` /
 * `importSave` reach them — load-bearing for the balance solver's
 * build-once + importSave-per-iteration flow (per producer/balance/bot.ts).
 */
function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    dependencies: [
      'scaler/antimatter',
      'scaler/prestige',
      'scaler/transcend',
      'scaler/achievements',
    ],
    install(): void {
      // Bot wiring runs in connect() because it reads ScalerTiersKey,
      // which is fully populated only after every tier's connect() has
      // run (matches achievements module's connect-time wiring).
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);

      const upgradeAccum = persistent<number>(0, { name: 'upgradeAccum' });
      const upgradeInterval = 2;

      for (const tier of tiers) {
        installTierProducerAutoBuy(tier, ctx);
      }

      ctx.onTick((dt: number) => {
        upgradeAccum.value += dt;
        // Drain-while-≥-interval matches engine-side
        // setupPolicyAutoPurchase drain semantics so coarse-dt probes
        // (dt > interval) see N passes instead of 1. Necessary if a
        // future probe runs at dt larger than upgradeInterval.
        while (upgradeAccum.value >= upgradeInterval) {
          for (const tier of tiers) {
            sweepTierUpgrades(tier);
          }
          upgradeAccum.value -= upgradeInterval;
        }
      });

      // Prestige + transcend timing intentionally not wired here.
      // Sub-leaf D installs the ROI-aware rule per the file header.
    },
  };
}

function installTierProducerAutoBuy(tier: ScalerTier, ctx: EngineContext): void {
  setupPolicyAutoPurchase(
    tier.producers,
    {
      enabled: true,
      interval: 1,
      policy: buildTierProducerPolicy(tier.producers),
    },
    ctx.onTick,
  );
}

function sweepTierUpgrades(tier: ScalerTier): void {
  if (!tier.upgrades) return;
  for (const p of tier.upgrades.getAffordable()) {
    p.purchase();
  }
}

/**
 * Build a started, sim-bot-driven engine for the Scaler archetype.
 *
 * Wires:
 *   - 3× `setupPolicyAutoPurchase` over per-tier producer categories,
 *     interval 1s, `selectionHybridPayback`.
 *   - 2s upgrade sweep across all tiers.
 *   - Greedy prestige/transcend conversions.
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
    extraModules: [createBalanceBotModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('synergism-slim');
  engine.start();
  engine.stop();
  return engine;
}

export type { Tier };

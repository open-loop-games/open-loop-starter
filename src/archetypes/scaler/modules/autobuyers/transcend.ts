import { unref } from 'vue';
import {
  Decimal,
  persistent,
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  tunable,
  type EngineContext,
  type EngineModule,
} from 'open-loop-engine';
import { ScalerTiersKey } from '../tiers';
import { ScalerTuningRegistryKey } from '../tuning';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  autobuyerGate,
  type AutobuyerSpec,
} from './index';
import { buildTierProducerPolicy } from './antimatter';
import { computeRatioPolicyPayback } from './payback';
import type { PrestigeThresholdConfig } from './prestige';

// vanilla canonical:
//   SynergismOfficial/src/Automation.ts:33-48 — mythos-producer unlock
//     upgrades [90..93] paid in reincarnationPoints (slim-port drops the
//     reincarnate tier).
//   SynergismOfficial/src/Automation.ts:116-125 — autoUpgrades for transcend
//     upgrades, gated on player.upgrades[99] + shoptoggles.transcend.
//   SynergismOfficial/src/Challenges.ts:595-680 (runChallengeSweep) —
//     auto-attempt state machine. Slim port collapses to "auto-attempt
//     next-priority unfinished challenge with cooldown" — the heavier
//     state-machine surface is fork-extension territory.
//
// Unlock gate: tier-presence read from `transcendPoints.cumulative`, which
// crosses zero exactly at the first successful Transcend conversion.

// ECC-sweep autobuyer config schema. Modeled on the slim subset of
// Synergism's auto-challenge surface (Synergism.ts:995-1020): per-challenge
// enable bitmap + a between-challenge cooldown. The `mode` key reserves
// space for 'priority' (sweep in id order) vs 'manual' (explicit ordering)
// without committing to either at sub-leaf B.
export type EccSweepMode = 'never' | 'priority';

export interface EccSweepConfig {
  mode: EccSweepMode;
  /** Per-challenge enable. Default false. Slim subset of autoChallengeToggles. */
  perChallenge: Record<string, boolean>;
  /** Sim-seconds between attempts. Stub. Sub-leaf E pins. */
  attemptCooldown: number;
}

export function createTranscendAutobuyersModule(): EngineModule {
  return {
    id: 'scaler/autobuyers/transcend',
    dependencies: ['scaler/transcend', 'scaler/autobuyers'],
    install(): void {
      // Wiring lives in connect() — see antimatter autobuyer module for rationale.
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const tier = tiers.find((t) => t.id === 'transcend');
      if (!tier) throw new Error('scaler/autobuyers/transcend: transcend tier missing');
      if (!tier.upgrades || !tier.conversion || !tier.challenges) {
        throw new Error(
          'scaler/autobuyers/transcend: transcend upgrades/conversion/challenges missing',
        );
      }

      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);
      const tuningRegistry = ctx.inject(ScalerTuningRegistryKey);

      // Declared-invention knob: transcend ROI payback threshold. Mirrors
      // the prestige-side knob; sub-leaf E (OL-859) drives transcend-tier
      // beats and may bisect this against beat-6 (first transcend fires).
      const roiThresholdSec = tunable<number>(
        tuningRegistry,
        'modules/autobuyers/transcend/ROI_THRESHOLD_SEC',
        () => 60,
      );

      // Tier-presence gate for downstream autobuyers (mythos producer +
      // transcend upgrade auto-buy). transcendPoints.cumulative crosses zero
      // at the first successful Transcend conversion and stays monotonic.
      const cumulative = tier.currency.cumulative;
      if (!cumulative) {
        throw new Error('scaler/autobuyers/transcend: transcendPoints missing cumulative slot');
      }
      const isUnlocked = () => Decimal.gt(cumulative.value, 0);

      // Threshold-autobuyer unlock — same chicken-and-egg avoidance as the
      // prestige tier (see autobuyers/prestige.ts). The body's ratio-policy
      // ROI gate + transcendReset.canReset capability gate prevent
      // premature firing.
      const thresholdUnlocked = () => true;

      // === producer auto-buy ===
      const producerAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/transcend/producers',
        groupId: 'transcend',
        displayName: 'Mythos producer auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'transcend-producers-active' }),
      };
      registry.push(producerAutoBuy);
      setupPolicyAutoPurchase(
        tier.producers,
        {
          enabled: autobuyerGate(master, producerAutoBuy),
          interval: 1,
          policy: buildTierProducerPolicy(tier.producers),
        },
        ctx.onTick,
      );

      // === transcend upgrade auto-buy ===
      const upgradeAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/transcend/upgrades',
        groupId: 'transcend',
        displayName: 'Transcend upgrade auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'transcend-upgrades-active' }),
      };
      registry.push(upgradeAutoBuy);
      setupSweepAutoPurchase(
        tier.upgrades.getAll().map((entry) => entry.purchasable),
        autobuyerGate(master, upgradeAutoBuy),
        ctx.onTick,
      );

      // === transcend threshold ===
      // Same stub shape as prestige threshold — sub-leaf D plugs in ROI math.
      const thresholdConfig: PrestigeThresholdConfig = { mode: 'never' };
      const lastConvertAt = persistent<number>(0, { name: 'transcend-threshold-last' });
      let elapsed = 0;

      const transcendThreshold: AutobuyerSpec<PrestigeThresholdConfig> = {
        id: 'autobuyer/transcend/threshold',
        groupId: 'transcend',
        displayName: 'Auto-transcend',
        isUnlocked: thresholdUnlocked,
        isActive: persistent<boolean>(false, { name: 'transcend-threshold-active' }),
        interval: 0.5,
        config: thresholdConfig,
        tick: (dt) => {
          elapsed += dt;
          // TODO(sub-leaf D): swap in ROI math per BALANCING.md § Theme 3 #5.
          switch (thresholdConfig.mode) {
            case 'never':
              return;
            case 'amount': {
              if (!tier.conversion!.canConvert.value) return;
              const gain = tier.conversion!.currentGain.value.transcendPoints;
              const threshold = unref(thresholdConfig.amountThreshold ?? Infinity);
              if (Number(gain) >= Number(threshold)) {
                tier.conversion!.convert();
                lastConvertAt.value = elapsed;
              }
              return;
            }
            case 'time': {
              if (!tier.conversion!.canConvert.value) return;
              const window = thresholdConfig.timeThreshold ?? Infinity;
              if (elapsed - lastConvertAt.value >= window) {
                tier.conversion!.convert();
                lastConvertAt.value = elapsed;
              }
              return;
            }
            case 'roi': {
              // Closed-form ratio-policy ROI mirroring the prestige-tier
              // body — see autobuyers/prestige.ts and payback.ts for the
              // derivation. Source resource is prestigeShards (the tier's
              // input); target is transcendPoints. Capability gate
              // (canConvert + gain > 0) is enforced by transcendReset.canReset.
              if (!tier.conversion!.canConvert.value) return;
              const gain = tier.conversion!.currentGain.value.transcendPoints;
              if (!Decimal.gt(gain, 0)) return;
              const cycleElapsed = elapsed - lastConvertAt.value;
              const payback = computeRatioPolicyPayback(gain, tier.currency.value, cycleElapsed);
              const threshold = thresholdConfig.roiPaybackSeconds ?? Number(unref(roiThresholdSec));
              if (payback <= threshold) {
                tier.conversion!.convert();
                lastConvertAt.value = elapsed;
              }
              return;
            }
          }
        },
      };
      registry.push(transcendThreshold);

      // === ECC challenge sweep (stub) ===
      // Slim port collapses Synergism's runChallengeSweep state machine to
      // "auto-attempt next priority-ordered unfinished challenge with
      // cooldown." Stub at sub-leaf B: ships with mode 'never' so nothing
      // fires. Sub-leaf E swaps in the attempt rule + per-challenge config.
      const eccSweepConfig: EccSweepConfig = {
        mode: 'never',
        perChallenge: {},
        attemptCooldown: 5,
      };
      let eccElapsed = 0;
      const lastEccAttemptAt = persistent<number>(0, { name: 'ecc-sweep-last' });

      const eccSweep: AutobuyerSpec<EccSweepConfig> = {
        id: 'autobuyer/transcend/ecc-sweep',
        groupId: 'transcend',
        displayName: 'Auto-ECC challenge attempts',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'ecc-sweep-active' }),
        interval: 0.5,
        config: eccSweepConfig,
        tick: (dt) => {
          eccElapsed += dt;
          // TODO(sub-leaf E): walk tier.challenges.getAll(); pick first
          // entry where perChallenge[id] && completions < completionLimit;
          // call enter(), then exit() after exitTimer or on goal.
          switch (eccSweepConfig.mode) {
            case 'never':
              return;
            case 'priority': {
              if (eccElapsed - lastEccAttemptAt.value < eccSweepConfig.attemptCooldown) return;
              return;
            }
          }
        },
      };
      registry.push(eccSweep);
    },
  };
}

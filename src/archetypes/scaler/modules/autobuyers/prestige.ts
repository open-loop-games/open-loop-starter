import { unref } from 'vue';
import {
  Decimal,
  persistent,
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  tunable,
  type DecimalSource,
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

// vanilla canonical (autobuyer set):
//   SynergismOfficial/src/Automation.ts:33-48 — diamond-producer unlock
//     upgrades [87..89] paid in transcendPoints.
//   SynergismOfficial/src/Automation.ts:88-115 — autoUpgrades for prestige
//     upgrades, gated on player.upgrades[92] + shoptoggles.prestige.
//   SynergismOfficial/src/Synergism.ts:3942-3991 — auto-prestige toggles
//     (player.toggles[28..30]) with timer/threshold modes per tier.
//
// Unlock gate: tier-presence read from `prestigePoints.cumulative`, which
// crosses zero exactly at the first successful Prestige conversion. No
// new state, no bot bypass — the bot naturally unlocks the prestige
// autobuyer the moment the antimatter autobuyer earns enough coins to
// trigger a prestige.

// Threshold-autobuyer config schema. Modeled on AD's BigCrunchAutobuyerState
// (big-crunch-autobuyer.js:26-65) — three policy modes with per-mode tunables.
//
// Slim-port mode set is the AD subset relevant to a 1-2h arc: AMOUNT (fire
// when conversion gain ≥ N), TIME (fire when `time-since-last-prestige` ≥ N),
// ROI (sub-leaf D's BALANCING.md § Theme 3 #5 paybackSeconds rule).
//
// Stub: every spec ships with `mode: 'never'` until sub-leaf D rewrites the
// tick body. The shape exists from day one so D can swap policy without
// restructuring the autobuyer.
export type PrestigeThresholdMode = 'never' | 'amount' | 'time' | 'roi';

export interface PrestigeThresholdConfig {
  mode: PrestigeThresholdMode;
  /** Required prestigePoints gain before firing (mode === 'amount'). */
  amountThreshold?: DecimalSource;
  /** Sim-seconds since last conversion before firing (mode === 'time'). */
  timeThreshold?: number;
  /** Acceptable payback seconds before firing (mode === 'roi'). Sub-leaf D. */
  roiPaybackSeconds?: number;
}

export function createPrestigeAutobuyersModule(): EngineModule {
  return {
    id: 'scaler/autobuyers/prestige',
    dependencies: ['scaler/prestige', 'scaler/prestige-vault', 'scaler/autobuyers'],
    install(): void {
      // Wiring lives in connect() — see antimatter autobuyer module for rationale.
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const tier = tiers.find((t) => t.id === 'prestige');
      if (!tier) throw new Error('scaler/autobuyers/prestige: prestige tier missing');
      if (!tier.upgrades || !tier.conversion) {
        throw new Error('scaler/autobuyers/prestige: prestige upgrades/conversion missing');
      }

      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);
      const tuningRegistry = ctx.inject(ScalerTuningRegistryKey);

      // Declared-invention knob: ROI payback threshold in sim-seconds.
      // Sub-leaf D's solver (balance/solve.ts solveBeat3) bisects this to
      // land beat-3 (first prestige fires) inside its window.
      const roiThresholdSec = tunable<number>(
        tuningRegistry,
        'modules/autobuyers/prestige/ROI_THRESHOLD_SEC',
        () => 60,
      );

      // Tier-presence gate for downstream autobuyers: prestige tier is
      // "reached" once any prestigePoints have been awarded. cumulative is
      // monotonic post-first-prestige; the gate stays unlocked across
      // subsequent resets. Diamond producer + Crystal upgrade auto-buy can't
      // do meaningful work pre-first-prestige (no producers / no upgrades to
      // afford), so this gate naturally tracks the tier-arrival moment.
      const cumulative = tier.currency.cumulative;
      if (!cumulative) {
        throw new Error('scaler/autobuyers/prestige: prestigePoints missing cumulative slot');
      }
      const isUnlocked = () => Decimal.gt(cumulative.value, 0);

      // Threshold-autobuyer unlock. The threshold autobuyer is the trigger
      // for entering the tier — gating it on prestigePoints.cumulative > 0
      // would deadlock the first prestige (autobuyer can't fire until prestige
      // has fired). Vanilla canonical surfaces an equivalent UI-level gate
      // via `player.upgrades[1...]` shop purchases (Synergism.ts:3942-3991),
      // which slim-port drops per the shop-omitted substrate. Slim's
      // threshold autobuyer is always available; the body's own ratio-policy
      // ROI gate + Reset.canReset capability gate handle "should fire" and
      // "can fire" respectively.
      const thresholdUnlocked = () => true;

      // === producer auto-buy ===
      const producerAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/prestige/producers',
        groupId: 'prestige',
        displayName: 'Diamond producer auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'prestige-producers-active' }),
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

      // === Crystal upgrade auto-buy ===
      const upgradeAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/prestige/upgrades',
        groupId: 'prestige',
        displayName: 'Crystal upgrade auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'prestige-upgrades-active' }),
      };
      registry.push(upgradeAutoBuy);
      setupSweepAutoPurchase(
        tier.upgrades.getAll().map((entry) => entry.purchasable),
        autobuyerGate(master, upgradeAutoBuy),
        ctx.onTick,
      );

      // === prestige threshold ===
      // Stub: ships with mode 'never' so it does not fire. The shape exists
      // from day one so sub-leaf D can swap in ROI math (BALANCING.md § Theme
      // 3 #5: paybackSeconds = cost / (rate × (multiplier − 1))) without
      // restructuring the autobuyer.
      //
      // OL-853 surfaced why a greedy policy is wrong here: prestige's
      // createCostRequirement uses `cost: () => coin.value` (modules/prestige.ts:138),
      // making `canConvert` trivially true at any coin value. A bot firing
      // every tick wipes antimatter before any beat lands.
      const thresholdConfig: PrestigeThresholdConfig = { mode: 'never' };
      const lastConvertAt = persistent<number>(0, { name: 'prestige-threshold-last' });
      let elapsed = 0;

      const prestigeThreshold: AutobuyerSpec<PrestigeThresholdConfig> = {
        id: 'autobuyer/prestige/threshold',
        groupId: 'prestige',
        displayName: 'Auto-prestige',
        isUnlocked: thresholdUnlocked,
        isActive: persistent<boolean>(false, { name: 'prestige-threshold-active' }),
        interval: 0.5,
        config: thresholdConfig,
        tick: (dt) => {
          elapsed += dt;
          // TODO(sub-leaf D): replace with ROI math per BALANCING.md § Theme
          // 3 #5. The mode/threshold/time config above is the swap surface;
          // each branch reads tier.conversion.{canConvert,currentGain} and
          // fires tier.conversion.convert() when its predicate clears.
          switch (thresholdConfig.mode) {
            case 'never':
              return;
            case 'amount': {
              if (!tier.conversion!.canConvert.value) return;
              const gain = tier.conversion!.currentGain.value.prestigePoints;
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
              // Closed-form ratio-policy ROI per BALANCING.md § Theme 3 #5,
              // adapted via `paybackSeconds ≈ cycleElapsed / (gainRatio − 1)`.
              // Maps onto Synergism `resettoggle1 mode 1` + AD `X_HIGHEST`
              // ratio thresholds — see computeRatioPolicyPayback for the
              // derivation. The capability gate (`canConvert` + gain > 0) is
              // enforced by the prestigeReset's `canReset` Gate at fire time;
              // this branch enforces only the policy-layer threshold.
              if (!tier.conversion!.canConvert.value) return;
              const gain = tier.conversion!.currentGain.value.prestigePoints;
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
      registry.push(prestigeThreshold);
    },
  };
}

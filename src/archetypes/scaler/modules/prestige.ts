import {
  addResource,
  bn,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type Gate,
  type Resource,
  createConversion,
  createCostRequirement,
  createLogFormula,
  createReset,
  createResource,
} from 'open-loop-engine';
import type { ScalerData } from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';
import { ScalerPrestigeVaultKey } from './prestige-vault';

// Cycle scope: state zeroed each prestige. Mirrors `Synergism Reset.ts:425-441`
// always-zeroed block (diamond *generated* counts, prestigeShards). Persistent
// infrastructure (diamond *owned* counts, Crystal upgrade levels, prestigePoints)
// lives in the sibling `scaler/prestige-vault` module so the prestigeReset
// scope walk does not reach it.
//
// Coin bootstrap on reset: `Reset.ts:408` writes `player.coins = new Decimal('102')`
// post-reset. Slim mirrors via `prestigeReset.onReset` setting coin.value = 1e2.
//
// === Cascade structure ===
//
// Diamond cascade: T(N).count = ownedN + generatedN. Each tier's tick emits
// `(owned + generated) × computedRate × dt` into the next-lower tier's
// generated resource. T1 emits to prestigeShards. Acyclic.
//
// vanilla canonical: SynergismOfficial/src/Synergism.ts:3206-3248.

export function createPrestigeModule(data: ScalerData): EngineModule {
  let prestigeShards!: Resource<DecimalSource>;

  return {
    id: 'scaler/prestige',
    dependencies: ['scaler/antimatter'],
    install(_ctx: EngineContext): void {
      prestigeShards = createResource<DecimalSource>(0, {
        displayName: 'Prestige Shards',
        precision: 2,
        id: 'scaler/prestige-shards',
      });

      // Diamond cascade scratch tallies (T(N).extraCount). Vault module reads
      // these by id at producer-creation time; auto-register in the engine
      // ResourceRegistry, no local references needed here.
      for (const position of [1, 2, 3, 4, 5]) {
        createResource<DecimalSource>(0, {
          precision: 0,
          id: `scaler/prestige/generated-${position}`,
        });
      }
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const antimatter = tiers.find((t) => t.id === 'antimatter');
      if (!antimatter) {
        throw new Error('scaler/prestige: antimatter tier not present in ScalerTiersKey');
      }
      const coin = antimatter.currency;

      const vault = ctx.inject(ScalerPrestigeVaultKey);

      // Capability gate. coin lives in scaler/antimatter (walked by prestigeReset),
      // so coin.cumulative resets each prestige and tracks "earned this cycle" —
      // canonical-equivalent of `coinsThisPrestige` (Synergism.ts:4784 gate).
      const canResetGate: Gate = {
        kind: 'cumulative-gte',
        resource: 'scaler/coins',
        value: data.balance.prestigeConversionLog,
      };

      // Reset scope: antimatter (coin, antimatter producers, antimatter
      // upgrades — canonical "always zero" block) plus this module's own
      // cycle-scratch state (prestigeShards, generated[]). The vault module
      // is intentionally absent — diamond producers + Crystal upgrades +
      // prestigePoints persist across prestige (canonical: zero only at
      // transcend per Reset.ts:480-499). onReset bootstraps coin to 102
      // mirroring Reset.ts:408 — without it, coin.value stays at 0 post-reset
      // and the autobuyer hardlocks.
      const prestigeReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige'],
        canReset: canResetGate,
        onReset: () => {
          coin.value = 1e2;
        },
      });

      // vanilla canonical: SynergismOfficial/src/Calculate.ts:2454 —
      //   prestigePointGain = floor(log_{1e25}(coins + 1))
      const formula = createLogFormula(data.balance.prestigeConversionLog);
      const conversion: Conversion = createConversion({
        inputs: {
          coin: createCostRequirement({
            resource: coin,
            cost: () => coin.value,
            pay: () => {
              coin.value = bn(0);
            },
          }),
        },
        outputs: {
          prestigePoints: {
            resource: vault.prestigePoints,
            amount: ({ coin }) => formula(coin),
          },
        },
        afterConvert: () => {
          // Increment count BEFORE reset.reset(): the reset sets
          // loadingSave=true around its scope walk, which suppresses the
          // cumulative-tracker watcher. Incrementing outside the reset
          // window keeps cumulative in lockstep with value.
          addResource(vault.prestigeCount, 1);
          prestigeReset.reset();
        },
      });

      const prestigeTier: ScalerTier = {
        id: 'prestige',
        currency: vault.prestigePoints,
        shards: prestigeShards,
        producers: vault.producers,
        upgrades: vault.crystalUpgrades as ScalerTier['upgrades'],
        conversion,
        reset: prestigeReset,
      };
      tiers.push(prestigeTier);
    },
  };
}

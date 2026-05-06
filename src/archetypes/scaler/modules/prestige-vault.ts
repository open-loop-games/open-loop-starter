import { unref, watch, type ComputedRef } from 'vue';
import {
  Decimal,
  Formula,
  ResourceRegistryKey,
  tunable,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
  createCostRequirement,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  persistent,
} from 'open-loop-engine';
import type { CrystalUpgradeDef, ProducerDef, ScalerData } from '../data/types';
import { ScalerTuningRegistryKey } from './tuning';

// Vault scope: state that persists across prestige resets and zeroes only at
// transcend. Mirrors the canonical reset boundary — `Reset.ts:425-441` zeroes
// diamond *generated* counts + prestigeShards on every reset; diamond *owned*
// counts and Crystal upgrade levels live until the transcend gate at
// `Reset.ts:480-499`. Slim's previous shape walked the entire prestige scope
// on prestige, nuking diamond infrastructure the player just paid prestigePoints
// for; this module isolates the persistent half so prestigeReset's scope walk
// no longer reaches it.
//
// vanilla canonical: SynergismOfficial/src/Reset.ts:425-441 (always-zeroed)
// vs Reset.ts:480-499 (transcend-gated zeroing).

export interface ScalerPrestigeVault {
  prestigePoints: Resource<DecimalSource> & Persistent<DecimalSource>;
  prestigeCount: Resource<DecimalSource> & Persistent<DecimalSource>;
  producers: ProducerCategory<ProducerDef>;
  crystalUpgrades: PurchasableCategory<CrystalUpgradeDef>;
}

export const ScalerPrestigeVaultKey: InjectionKey<ScalerPrestigeVault> = Symbol(
  'scaler/prestige-vault',
) as InjectionKey<ScalerPrestigeVault>;

export function createPrestigeVaultModule(data: ScalerData): EngineModule {
  const tier = data.prestige;

  let prestigePoints!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let prestigeCount!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let producers!: ProducerCategory<ProducerDef>;
  let crystalUpgrades!: PurchasableCategory<CrystalUpgradeDef>;

  return {
    id: 'scaler/prestige-vault',
    dependencies: ['scaler/prestige'],
    install(ctx: EngineContext): void {
      prestigePoints = createResource<DecimalSource>(0, {
        displayName: 'Prestige Points',
        precision: 2,
        id: 'scaler/prestige-points',
      });

      prestigeCount = createResource<DecimalSource>(0, {
        displayName: 'Prestiges',
        precision: 0,
        id: 'scaler/prestige-count',
      });

      const tuningRegistry = ctx.inject(ScalerTuningRegistryKey);
      const crystalPerLevelBonus = tunable(
        tuningRegistry,
        'modules/prestige/CRYSTAL_PER_LEVEL_BONUS',
        () => 0.05,
      );

      const registry = ctx.inject(ResourceRegistryKey);
      const prestigeShards = findResourceById(registry.list(), 'scaler/prestige-shards');
      const generated = [1, 2, 3, 4, 5].map((position) =>
        findResourceById(registry.list(), `scaler/prestige/generated-${position}`),
      );

      producers = createProducerCategory<ProducerDef>({
        id: 'scaler/prestige/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => {
          const idx = def.position - 1;
          const target = idx === 0 ? prestigeShards : generated[idx - 1]!;
          const own = generated[idx]!;
          return {
            resource: target,
            baseRate: 1,
            trigger: 'continuous',
            display: def.name,
            extraCount: () => own.value,
            purchase: {
              costResource: prestigePoints,
              baseCost: def.baseCost,
              costScaling: 1.4,
            },
          };
        },
      });
      producers.register(tier.producers);

      const rateChains = producers.getAll().map((entry) => entry.producer.rateChain);
      crystalUpgrades = buildCrystalUpgrades(prestigeShards, rateChains, crystalPerLevelBonus);
      crystalUpgrades.register(tier.crystalUpgrades);

      ctx.provide(ScalerPrestigeVaultKey, {
        prestigePoints,
        prestigeCount,
        producers,
        crystalUpgrades,
      });
    },
  };
}

// vanilla canonical: SynergismOfficial/src/Buy.ts:657 (calculateCrystalBuy) +
// Buy.ts:689-694 (cost paid in prestigeShards):
//   cost(level=n) = 10^(baseLogCost + costIncrement * ((n - 0.5)^2 / 2 - 1/8))
// Cost grows super-exponentially in level (the exponent itself grows
// quadratically). Slim port collapses each Crystal effect to a uniform per-
// level multiplicative grant onto every prestige rate chain.
function buildCrystalUpgrades(
  prestigeShards: Resource<DecimalSource>,
  rateChains: ModifierChain[],
  crystalPerLevelBonus: ComputedRef<DecimalSource>,
): PurchasableCategory<CrystalUpgradeDef> {
  const mirrors = new Map<string, Persistent<DecimalSource>>();

  return createPurchasableCategory<CrystalUpgradeDef>({
    id: 'scaler/prestige/crystal-upgrades',
    mapPurchasable: (def) => {
      const amount = persistent<DecimalSource>(0, { name: 'amountMirror' });
      mirrors.set(def.id, amount);

      const halfBack = Formula.variable(amount).sub(0.5);
      const exponent = halfBack
        .pow(2)
        .div(2)
        .sub(0.125)
        .mul(def.costIncrement)
        .add(def.baseLogCost);
      const cost = Formula.constant(10).pow(exponent);

      return {
        display: { title: def.name, description: def.description },
        requirements: createCostRequirement({ resource: prestigeShards, cost }),
        effect: (a) => Decimal.add(1, Decimal.mul(a, unref(crystalPerLevelBonus))),
      };
    },
    mapState: (def, purchasable) => {
      const amount = mirrors.get(def.id);
      if (!amount) throw new Error(`scaler/prestige-vault: missing amount mirror for ${def.id}`);

      watch(
        () => purchasable.amount.value,
        (v) => {
          amount.value = v;
        },
        { immediate: true, flush: 'sync' },
      );

      for (const chain of rateChains) {
        chain.bind({
          active: () => Decimal.gt(purchasable.amount.value, 0),
          modifier: createMultiplicativeModifier({
            multiplier: () => purchasable.effect.value,
            description: def.name,
          }),
        });
      }
    },
  });
}

function findResourceById(
  entries: readonly { resource: { id?: string }; context: string | undefined }[],
  id: string,
): Resource<DecimalSource> {
  const found = entries.find((e) => e.resource.id === id);
  if (!found) throw new Error(`scaler/prestige-vault: resource '${id}' not in ResourceRegistry`);
  return found.resource as Resource<DecimalSource>;
}

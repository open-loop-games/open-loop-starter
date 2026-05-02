import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Producer,
  type ProducerCategory,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
  createCostRequirement,
  createCumulativeConversion,
  createLogFormula,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
} from 'open-loop-engine';
import type { CrystalUpgradeDef, PrestigeTierData, ProducerDef, ScalerData } from '../data/types';
import { AntimatterCoinKey } from './antimatter';
import { PrestigeResetKey } from './resets';

// === Injection keys ===

export const PrestigePointsKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'scaler/prestige/points',
) as InjectionKey<Resource<DecimalSource>>;

export const PrestigeShardsKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'scaler/prestige/shards',
) as InjectionKey<Resource<DecimalSource>>;

export const PrestigeProducersKey: InjectionKey<ProducerCategory<ProducerDef>> = Symbol(
  'scaler/prestige/producers',
) as InjectionKey<ProducerCategory<ProducerDef>>;

export const CrystalUpgradesKey: InjectionKey<PurchasableCategory<CrystalUpgradeDef>> = Symbol(
  'scaler/prestige/crystal-upgrades',
) as InjectionKey<PurchasableCategory<CrystalUpgradeDef>>;

export const PrestigeRateChainsKey: InjectionKey<ModifierChain[]> = Symbol(
  'scaler/prestige/rate-chains',
) as InjectionKey<ModifierChain[]>;

export const PrestigeShardRateKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'scaler/prestige/shard-rate',
) as InjectionKey<ComputedRef<DecimalSource>>;

// vanilla canonical: SynergismOfficial/src/Calculate.ts:2454 —
//   prestigePointGain = floor(log_{1e25}(coins + 1))
// `createLogFormula(base)` already handles the `<= 1 → 0` floor; the off-
// by-one (Synergism's `+1`) reduces to the same boundary behavior at the
// scales the slim port covers. Conversion adds the gain to the cumulative
// prestigePoints currency, then the prestigeReset zeroes coins +
// antimatter producers + Crystal upgrade levels per Reset.ts:400-499.
export const PrestigeConversionKey: InjectionKey<Conversion> = Symbol(
  'scaler/prestige/conversion',
) as InjectionKey<Conversion>;

// === Slim-port balance constants ===
//
// Diamond producers generate prestigeShards. Synergism's diamond cascade
// (Synergism.ts:3206-3239 — produceFifthDiamonds → ... → produceFirstDiamonds
// → prestigeShards) is dropped per the antimatter rationale; flat per-second
// rates sized so the late-tier producers pay back in ~2000s pre-multipliers.
//
// vanilla canonical (cost): SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts
const DIAMOND_BASE_RATES: Record<string, DecimalSource> = {
  'prestige-1': '0.1',
  'prestige-2': '50',
  'prestige-3': '7.5e6',
  'prestige-4': '2e19',
  'prestige-5': '5e49',
};

// === Module ===

export function createPrestigeModule(data: ScalerData): EngineModule {
  const tier = data.prestige;
  // Closure-scoped refs that install() creates and connect() reads. The
  // engine wraps install + connect in a single per-module persistent
  // context; closure-capture is the standard cross-phase wiring pattern.
  let prestigePoints!: Resource<DecimalSource>;

  return {
    id: 'scaler/prestige',
    dependencies: ['scaler/antimatter'],
    install(ctx: EngineContext): void {
      // prestigePoints: cumulative across prestiges; consumed by Crystal
      // upgrade purchases (Synergism Buy.ts:684 — calculateCrystalBuy
      // converts log10(prestigeShards) into Crystal levels and pays in
      // prestigeShards, but the slim port routes Crystal cost through
      // prestigeShards directly per the leaf-1 data model).
      prestigePoints = createResource<DecimalSource>(0, {
        displayName: 'Prestige Points',
        precision: 2,
        id: 'scaler/prestige-points',
      });

      // prestigeShards: per-prestige currency generated continuously by
      // diamond producers. Consumed by Crystal upgrades. Resets on each
      // Prestige (set to 0 in scope of scaler/prestige).
      const prestigeShards = createResource<DecimalSource>(0, {
        displayName: 'Prestige Shards',
        precision: 2,
        id: 'scaler/prestige-shards',
      });

      const producers = createProducerCategory<ProducerDef>({
        id: 'scaler/prestige/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: prestigeShards,
          baseRate: DIAMOND_BASE_RATES[def.id] ?? 0,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            // Diamond producers cost prestigePoints — the cumulative-across-
            // prestige currency. Players save up prestigePoints over many
            // prestiges to afford higher-tier diamond producers.
            costResource: prestigePoints,
            baseCost: def.baseCost,
            costScaling: 1.4,
          },
        }),
      });
      producers.register(tier.producers);

      const rateChains = collectRateChains(producers, tier);

      const crystalUpgrades = buildCrystalUpgrades(prestigeShards, tier, rateChains);

      const shardRate = computed(() => producers.getTotalRate(prestigeShards));

      ctx.provide(PrestigePointsKey, prestigePoints);
      ctx.provide(PrestigeShardsKey, prestigeShards);
      ctx.provide(PrestigeProducersKey, producers);
      ctx.provide(CrystalUpgradesKey, crystalUpgrades);
      ctx.provide(PrestigeRateChainsKey, rateChains);
      ctx.provide(PrestigeShardRateKey, shardRate);
    },
    connect(ctx: EngineContext): void {
      // Conversion construction is deferred to connect() because it pairs
      // with prestigeReset (provided by scaler/resets.install). Engine
      // ordering: all install() runs, then all connect() runs in the same
      // topological order — by the time prestige.connect fires,
      // resets.install has provided every reset key.
      const coin = ctx.inject(AntimatterCoinKey);
      const reset = ctx.inject(PrestigeResetKey);
      const conversion = createCumulativeConversion({
        baseResource: coin,
        gainResource: prestigePoints,
        formula: createLogFormula(data.balance.prestigeConversionLog),
        reset,
      });
      ctx.provide(PrestigeConversionKey, conversion);
    },
  };
}

function collectRateChains(
  producers: ProducerCategory<ProducerDef>,
  tier: PrestigeTierData,
): ModifierChain[] {
  const chains: ModifierChain[] = [];
  for (const def of tier.producers) {
    const producer: Producer | undefined = producers.getProducer(def.id);
    if (producer) chains.push(producer.rateChain);
  }
  return chains;
}

// vanilla canonical: SynergismOfficial/src/Buy.ts:657 (calculateCrystalBuy) +
// Buy.ts:689-694 (cost paid in prestigeShards):
//   cost(level=n) = 10^(baseLogCost + costIncrement * ((n - 0.5)^2 / 2 - 1/8))
// Cost grows super-exponentially in level (the exponent itself grows
// quadratically) — geometric `createScalingPurchasable` doesn't fit. Use
// raw createPurchasable + custom Computable cost reading the purchasable's
// own amount. Each Crystal upgrade also feeds a per-level multiplicative
// modifier into all prestige rateChains.
function buildCrystalUpgrades(
  prestigeShards: Resource<DecimalSource>,
  tier: PrestigeTierData,
  rateChains: ModifierChain[],
): PurchasableCategory<CrystalUpgradeDef> {
  // Forward-declared via `let` so the per-def `mapPurchasable` closures can
  // read `category.getPurchasable(def.id)?.amount.value` for the cost +
  // grant lookups. Closures only fire after createPurchasableCategory has
  // returned and assigned `category`, so the mid-construction reference is
  // safe at runtime.
  let category: PurchasableCategory<CrystalUpgradeDef>;
  // eslint-disable-next-line prefer-const
  category = createPurchasableCategory<CrystalUpgradeDef>({
    id: 'scaler/prestige/crystal-upgrades',
    mapPurchasable: (def) => ({
      display: { title: def.name, description: def.description },
      // The cost requirement reads the purchasable's amount via the entry
      // lookup — by the time the requirement is evaluated, the purchasable
      // has been registered into the category's entry map.
      requirements: createCostRequirement({
        resource: prestigeShards,
        cost: () => crystalNextCost(def, category.getPurchasable(def.id)),
      }),
      // Slim-port effect: per-level fractional bonus. Synergism's actual
      // crystal effects route through globalCoinMultiplier with per-upgrade
      // formulas (Variables.ts:131 onwards); the slim port collapses each
      // Crystal to a +CRYSTAL_PER_LEVEL_BONUS multiplicative-per-level grant
      // onto every prestige rateChain. Balance leaf will refine.
      effect: (amount: DecimalSource) =>
        Decimal.add(1, Decimal.mul(amount, CRYSTAL_PER_LEVEL_BONUS)),
      grants: [
        {
          chain: rateChains,
          mult: () => category.getPurchasable(def.id)?.effect.value ?? 1,
          description: def.name,
        },
      ],
    }),
  });
  category.register(tier.crystalUpgrades);
  return category;
}

const CRYSTAL_PER_LEVEL_BONUS = 0.05;

function crystalNextCost(
  def: CrystalUpgradeDef,
  purchasable: Purchasable | undefined,
): DecimalSource {
  const current = purchasable ? purchasable.amount.value : 0;
  const next = Decimal.add(current, 1);
  // Per Buy.ts:693 — cost(toBuy) = 10^(baseLogCost + costIncrement * (1/2 * (toBuy - 0.5)^2 - 1/8))
  const halfNext = Decimal.sub(next, 0.5);
  const exponent = Decimal.add(
    def.baseLogCost,
    Decimal.mul(def.costIncrement, Decimal.sub(Decimal.div(Decimal.pow(halfNext, 2), 2), 0.125)),
  );
  return Decimal.pow(10, exponent);
}

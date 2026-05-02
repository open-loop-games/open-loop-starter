import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Producer,
  type ProducerCategory,
  type Purchasable,
  type Resource,
  createCostRequirement,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasable,
  createResource,
} from 'open-loop-engine';
import type {
  AntimatterTierData,
  AntimatterUpgradeDef,
  ProducerDef,
  ScalerData,
} from '../data/types';

// === Injection keys ===

export const AntimatterCoinKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'scaler/antimatter/coin',
) as InjectionKey<Resource<DecimalSource>>;

export const AntimatterProducersKey: InjectionKey<ProducerCategory<ProducerDef>> = Symbol(
  'scaler/antimatter/producers',
) as InjectionKey<ProducerCategory<ProducerDef>>;

export const AntimatterAcceleratorKey: InjectionKey<Purchasable> = Symbol(
  'scaler/antimatter/accelerator',
) as InjectionKey<Purchasable>;

export const AntimatterMultiplierKey: InjectionKey<Purchasable> = Symbol(
  'scaler/antimatter/multiplier',
) as InjectionKey<Purchasable>;

export const AntimatterRateChainsKey: InjectionKey<ModifierChain[]> = Symbol(
  'scaler/antimatter/rate-chains',
) as InjectionKey<ModifierChain[]>;

export const AntimatterTotalRateKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'scaler/antimatter/total-rate',
) as InjectionKey<ComputedRef<DecimalSource>>;

// === Slim-port balance constants ===
//
// Synergism's coin tier baseRate is derived through the cascade machinery
// (Synergism.ts:4370-4405 — produceFifth → produceFourth → ... → produceFirst
// → coins, gated behind upgrades 101-105). Slim port drops the cascade and
// gives each producer a flat per-second rate sized so the cost-payback time
// stays roughly constant across tiers (cost / rate ≈ 1000s before any
// Accelerator/Multiplier multipliers apply). Balance leaf will revisit.
//
// vanilla canonical (cost): SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts
const PRODUCER_BASE_RATES: Record<string, DecimalSource> = {
  'antimatter-1': '0.1',
  'antimatter-2': '1',
  'antimatter-3': '20',
  'antimatter-4': '400',
  'antimatter-5': '8000',
};

// vanilla canonical: SynergismOfficial/src/Buy.ts:32 —
//   cost = 500 * (4/G.costDivisor)^buyingTo
// Slim port treats G.costDivisor = 1 (no rune/research cost reductions yet)
// and stays under Synergism's n=125 threshold where the factorial branch
// kicks in. Pure geometric scaling.
const ACCELERATOR_COST_SCALING = 4;

// vanilla canonical: SynergismOfficial/src/Buy.ts:161 —
//   cost = 1e4 * 10^(buyingTo / G.costDivisor)
// Same simplification as Accelerator — geometric in level.
const MULTIPLIER_COST_SCALING = 10;

// Per-bought-level multiplier into the antimatter rate chains. Synergism's
// effect is the product of acceleratorEffect * multiplierEffect feeding
// `globalCoinMultiplier` through `updateAllTick` / `updateAllMultiplier`.
// Slim port models each upgrade as a flat multiplicative-per-level grant
// onto every antimatter producer's rateChain.
//
// vanilla canonical: SynergismOfficial/src/Calculate.ts — getAcceleratorPower()
// (linear-then-thresholded effect that compounds against count). Slim-port
// constant approximates the early-game payout shape; balance leaf refines.
const ACCELERATOR_PER_LEVEL_MULT = 1.05;
const MULTIPLIER_PER_LEVEL_MULT = 2;

// === Module ===

export function createAntimatterModule(data: ScalerData): EngineModule {
  const tier = data.antimatter;

  return {
    id: 'scaler/antimatter',
    install(ctx: EngineContext): void {
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:250 —
      //   coins: new Decimal('1e2')
      // Bootstrap grant: the cheapest producer (Worker) costs 100 coins, so
      // a 0-coin start hardlocks the player. Synergism seeds the same amount.
      const coin = createResource<DecimalSource>('1e2', {
        displayName: 'Coins',
        precision: 0,
        id: 'scaler/coins',
      });

      const producers = createProducerCategory<ProducerDef>({
        id: 'scaler/antimatter/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: coin,
          baseRate: PRODUCER_BASE_RATES[def.id] ?? 0,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            costResource: coin,
            baseCost: def.baseCost,
            // Within-tier cost ramp. Per-tier baseCost gap from Synergism
            // (100 → 1e3 → 2e4 → 4e5 → 8e6) does the heavy lifting for tier
            // separation; per-buy ramp keeps tier-level pacing.
            costScaling: 1.15,
          },
        }),
      });
      producers.register(tier.producers);

      const rateChains = collectRateChains(producers, tier);

      const accelerator = buildScalingUpgrade({
        def: findUpgrade(tier.upgrades, 'accelerator'),
        coin,
        rateChains,
        costScaling: ACCELERATOR_COST_SCALING,
        perLevelMult: ACCELERATOR_PER_LEVEL_MULT,
      });
      const multiplier = buildScalingUpgrade({
        def: findUpgrade(tier.upgrades, 'multiplier'),
        coin,
        rateChains,
        costScaling: MULTIPLIER_COST_SCALING,
        perLevelMult: MULTIPLIER_PER_LEVEL_MULT,
      });

      const totalRate = computed(() => producers.getTotalRate(coin));

      ctx.provide(AntimatterCoinKey, coin);
      ctx.provide(AntimatterProducersKey, producers);
      ctx.provide(AntimatterAcceleratorKey, accelerator);
      ctx.provide(AntimatterMultiplierKey, multiplier);
      ctx.provide(AntimatterRateChainsKey, rateChains);
      ctx.provide(AntimatterTotalRateKey, totalRate);
    },
  };
}

function collectRateChains(
  producers: ProducerCategory<ProducerDef>,
  tier: AntimatterTierData,
): ModifierChain[] {
  const chains: ModifierChain[] = [];
  for (const def of tier.producers) {
    const producer: Producer | undefined = producers.getProducer(def.id);
    if (producer) chains.push(producer.rateChain);
  }
  return chains;
}

interface BuildScalingUpgradeOptions {
  def: AntimatterUpgradeDef;
  coin: Resource<DecimalSource>;
  rateChains: ModifierChain[];
  costScaling: DecimalSource;
  perLevelMult: DecimalSource;
}

// Cumulative-buy upgrade (Accelerator / Multiplier). Cost is geometric in
// the bought count; effect compounds into every antimatter rateChain via a
// chain-bound multiplicative modifier. createPurchasableCategory's
// `mapPurchasable` doesn't fit cleanly because the cost closure needs to
// read the purchasable's own `amount.value` — the category's `mapPurchasable`
// runs before the per-def Purchasable exists.
function buildScalingUpgrade(opts: BuildScalingUpgradeOptions): Purchasable {
  const { def, coin, rateChains, costScaling, perLevelMult } = opts;

  let purchasable: Purchasable;
  // eslint-disable-next-line prefer-const
  purchasable = createPurchasable({
    id: def.id,
    display: { title: def.name, description: def.description },
    requirements: createCostRequirement({
      resource: coin,
      cost: () => Decimal.mul(def.baseCost, Decimal.pow(costScaling, purchasable.amount.value)),
    }),
    effect: (amount: DecimalSource) => Decimal.pow(perLevelMult, amount),
  });

  for (const chain of rateChains) {
    chain.bind({
      active: () => Decimal.gt(purchasable.amount.value, 0),
      modifier: createMultiplicativeModifier({
        multiplier: () => purchasable.effect.value,
        description: def.name,
      }),
    });
  }

  return purchasable;
}

function findUpgrade(upgrades: AntimatterUpgradeDef[], id: string): AntimatterUpgradeDef {
  const def = upgrades.find((u) => u.id === id);
  if (!def) throw new Error(`scaler/antimatter: missing upgrade definition "${id}"`);
  return def;
}

import {
  Decimal,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ProducerCategory,
  type Purchasable,
  type PurchasableGroup,
  type Resource,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableGroup,
  createResource,
  createScalingPurchasable,
} from 'open-loop-engine';
import type { AntimatterUpgradeDef, ProducerDef, ScalerData } from '../data/types';

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

export const AntimatterUpgradeGroupKey: InjectionKey<PurchasableGroup> = Symbol(
  'scaler/antimatter/upgrade-group',
) as InjectionKey<PurchasableGroup>;

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

      const accelerator = buildScalingUpgrade({
        def: findUpgrade(tier.upgrades, 'accelerator'),
        coin,
        producers,
        costScaling: ACCELERATOR_COST_SCALING,
        perLevelMult: ACCELERATOR_PER_LEVEL_MULT,
      });
      const multiplier = buildScalingUpgrade({
        def: findUpgrade(tier.upgrades, 'multiplier'),
        coin,
        producers,
        costScaling: MULTIPLIER_COST_SCALING,
        perLevelMult: MULTIPLIER_PER_LEVEL_MULT,
      });

      const upgradeGroup = createPurchasableGroup({
        purchasables: [accelerator, multiplier],
      });

      ctx.provide(AntimatterCoinKey, coin);
      ctx.provide(AntimatterProducersKey, producers);
      ctx.provide(AntimatterAcceleratorKey, accelerator);
      ctx.provide(AntimatterMultiplierKey, multiplier);
      ctx.provide(AntimatterUpgradeGroupKey, upgradeGroup);
    },
  };
}

interface BuildScalingUpgradeOptions {
  def: AntimatterUpgradeDef;
  coin: Resource<DecimalSource>;
  producers: ProducerCategory<ProducerDef>;
  costScaling: DecimalSource;
  perLevelMult: DecimalSource;
}

// Cumulative-buy upgrade (Accelerator / Multiplier). Geometric cost is the
// native createScalingPurchasable shape; per-level effect compounds into
// every antimatter rateChain via post-creation chain.bind closing over the
// returned Purchasable.
function buildScalingUpgrade(opts: BuildScalingUpgradeOptions): Purchasable {
  const { def, coin, producers, costScaling, perLevelMult } = opts;

  const purchasable = createScalingPurchasable({
    id: def.id,
    title: def.name,
    description: def.description,
    resource: coin,
    baseCost: def.baseCost,
    costScaling,
    effect: (amount: DecimalSource) => Decimal.pow(perLevelMult, amount),
  });

  for (const entry of producers.getAll()) {
    entry.producer.rateChain.bind({
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

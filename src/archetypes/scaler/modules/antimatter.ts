import { watch } from 'vue';
import {
  Decimal,
  Formula,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
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
import type { AntimatterUpgradeDef, ProducerDef, ScalerData } from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';

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

// Per-upgrade cost ramp. Slim port treats G.costDivisor = 1 (no rune/research
// cost reductions yet) and stays under Synergism's n=125 threshold where the
// factorial branch kicks in — pure geometric scaling.
//
// vanilla canonical (accelerator): SynergismOfficial/src/Buy.ts:32 —
//   cost = 500 * (4/G.costDivisor)^buyingTo
// vanilla canonical (multiplier): SynergismOfficial/src/Buy.ts:161 —
//   cost = 1e4 * 10^(buyingTo / G.costDivisor)
const UPGRADE_COST_SCALING: Record<string, DecimalSource> = {
  accelerator: 4,
  multiplier: 10,
};

// Per-bought-level multiplier into the antimatter rate chains. Synergism's
// effect is the product of acceleratorEffect * multiplierEffect feeding
// `globalCoinMultiplier` through `updateAllTick` / `updateAllMultiplier`.
// Slim port models each upgrade as a flat multiplicative-per-level grant.
//
// vanilla canonical: SynergismOfficial/src/Calculate.ts — getAcceleratorPower()
// (linear-then-thresholded effect that compounds against count). Slim-port
// constant approximates the early-game payout shape; balance leaf refines.
const UPGRADE_PER_LEVEL_MULT: Record<string, DecimalSource> = {
  accelerator: 1.05,
  multiplier: 2,
};

// === Module ===

export function createAntimatterModule(data: ScalerData): EngineModule {
  const tier = data.antimatter;

  let coin!: Resource<DecimalSource>;
  let producers!: ProducerCategory<ProducerDef>;
  let upgrades!: PurchasableCategory<AntimatterUpgradeDef>;

  return {
    id: 'scaler/antimatter',
    install(ctx: EngineContext): void {
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:250 —
      //   coins: new Decimal('1e2')
      // Bootstrap grant: the cheapest producer (Worker) costs 100 coins, so
      // a 0-coin start hardlocks the player. Synergism seeds the same amount.
      coin = createResource<DecimalSource>('1e2', {
        displayName: 'Coins',
        precision: 0,
        id: 'scaler/coins',
      });

      producers = createProducerCategory<ProducerDef>({
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

      upgrades = buildUpgrades(coin, producers);
      upgrades.register(tier.upgrades);
    },
    connect(ctx: EngineContext): void {
      // antimatter is the leaf currency tier — no Conversion (no Prestige-
      // -into-antimatter action; coins are the input to Prestige, not the
      // output of any Conversion at this layer) and no consumer-facing
      // Reset (Synergism's Prestige clears antimatter; the prestige module
      // owns that Reset and includes 'scaler/antimatter' in its scope).
      // Antimatter is the first-installed tier, so it owns the
      // ScalerTiersKey provide; downstream tiers inject and push.
      const antimatterTier: ScalerTier = {
        id: 'antimatter',
        currency: coin,
        producers,
        upgrades,
      };
      ctx.provide(ScalerTiersKey, [antimatterTier]);
    },
  };
}

// Cumulative-buy upgrades (Accelerator + Multiplier) as a PurchasableCategory.
// Geometric cost via Formula.exponential — same internal shape as
// createScalingPurchasable (purchasable.ts:672-728), authored inline because
// mapPurchasable returns options rather than a constructed Purchasable. The
// chain.bind loop runs in mapState because the multiplier reads
// `purchasable.effect.value`, only available post-construction.
function buildUpgrades(
  coin: Resource<DecimalSource>,
  producers: ProducerCategory<ProducerDef>,
): PurchasableCategory<AntimatterUpgradeDef> {
  const mirrors = new Map<string, Persistent<DecimalSource>>();

  return createPurchasableCategory<AntimatterUpgradeDef>({
    id: 'scaler/antimatter/upgrades',
    mapPurchasable: (def) => {
      const amount = persistent<DecimalSource>(0, { name: 'amountMirror' });
      mirrors.set(def.id, amount);

      const costScaling = UPGRADE_COST_SCALING[def.id] ?? 1;
      const perLevelMult = UPGRADE_PER_LEVEL_MULT[def.id] ?? 1;

      const cost = Formula.exponential(amount, def.baseCost, costScaling);

      return {
        display: { title: def.name, description: def.description },
        requirements: createCostRequirement({ resource: coin, cost }),
        effect: (a: DecimalSource) => Decimal.pow(perLevelMult, a),
      };
    },
    mapState: (def, purchasable) => {
      const amount = mirrors.get(def.id);
      if (!amount) throw new Error(`scaler/antimatter: missing amount mirror for ${def.id}`);

      // Mirror purchasable.amount → external amount so the cost Formula
      // re-evaluates after each purchase. `flush: 'sync'` matches
      // createScalingPurchasable's discipline (purchasable.ts:722-728).
      watch(
        () => purchasable.amount.value,
        (v) => {
          amount.value = v;
        },
        { immediate: true, flush: 'sync' },
      );

      // Per-level multiplicative grant onto every antimatter rate chain.
      for (const entry of producers.getAll()) {
        entry.producer.rateChain.bind({
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

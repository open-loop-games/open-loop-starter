import { watch } from 'vue';
import {
  Decimal,
  Formula,
  bn,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type ModifierChain,
  type Persistent,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
  createConversion,
  createCostRequirement,
  createLogFormula,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableCategory,
  createReset,
  createResource,
  persistent,
} from 'open-loop-engine';
import type { CrystalUpgradeDef, ProducerDef, ScalerData } from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';

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

const CRYSTAL_PER_LEVEL_BONUS = 0.05;

// === Module ===

export function createPrestigeModule(data: ScalerData): EngineModule {
  const tier = data.prestige;

  let prestigePoints!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let prestigeShards!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let producers!: ProducerCategory<ProducerDef>;
  let crystalUpgrades!: PurchasableCategory<CrystalUpgradeDef>;

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
      // Prestige (zeroed when prestigeReset walks the scaler/prestige scope).
      prestigeShards = createResource<DecimalSource>(0, {
        displayName: 'Prestige Shards',
        precision: 2,
        id: 'scaler/prestige-shards',
      });

      producers = createProducerCategory<ProducerDef>({
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

      const rateChains = producers.getAll().map((entry) => entry.producer.rateChain);

      crystalUpgrades = buildCrystalUpgrades(prestigeShards, rateChains);
      crystalUpgrades.register(tier.crystalUpgrades);
    },
    connect(ctx: EngineContext): void {
      // Cross-tier dep: coin from antimatter, fetched via the tiers registry
      // antimatter.connect() provided. By connect-time all installs are
      // done, so antimatter's tier entry is present.
      const tiers = ctx.inject(ScalerTiersKey);
      const antimatter = tiers.find((t) => t.id === 'antimatter');
      if (!antimatter) {
        throw new Error('scaler/prestige: antimatter tier not present in ScalerTiersKey');
      }
      const coin = antimatter.currency;

      // Module-scoped reset. resetModules walks both antimatter + prestige
      // persistent contexts; `keep: [prestigePoints]` exempts the cumulative
      // currency the conversion just incremented. Without it, afterConvert
      // → reset.reset() would zero the gain that was written one step
      // earlier (conversion.ts:204-211).
      const prestigeReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige'],
        keep: [prestigePoints],
      });

      // vanilla canonical: SynergismOfficial/src/Calculate.ts:2454 —
      //   prestigePointGain = floor(log_{1e25}(coins + 1))
      // `createLogFormula(base)` already handles the `<= 1 → 0` floor; the
      // off-by-one (Synergism's `+1`) reduces to the same boundary behavior
      // at the scales the slim port covers. Conversion adds gain to
      // prestigePoints, then prestigeReset zeroes coins + antimatter
      // producers + Crystal upgrade levels per Reset.ts:400-499.
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
            resource: prestigePoints,
            amount: ({ coin }) => formula(coin),
          },
        },
        afterConvert: () => {
          prestigeReset.reset();
        },
      });

      const prestigeTier: ScalerTier = {
        id: 'prestige',
        currency: prestigePoints,
        shards: prestigeShards,
        producers,
        upgrades: crystalUpgrades as ScalerTier['upgrades'],
        conversion,
        reset: prestigeReset,
      };
      tiers.push(prestigeTier);
    },
  };
}

// vanilla canonical: SynergismOfficial/src/Buy.ts:657 (calculateCrystalBuy) +
// Buy.ts:689-694 (cost paid in prestigeShards):
//   cost(level=n) = 10^(baseLogCost + costIncrement * ((n - 0.5)^2 / 2 - 1/8))
// Cost grows super-exponentially in level (the exponent itself grows
// quadratically) — geometric `createScalingPurchasable` doesn't fit, so the
// per-def `mapPurchasable` builds the cost as a Formula over an external
// amount mirror, same internal shape as createScalingPurchasable
// (purchasable.ts:672-728). The mirror is bridged via `mapState` because
// `purchasable.amount` doesn't exist at mapPurchasable-return time.
//
// TODO(expansion): `costScaling: { threshold, scale }` candidate (see
// open-loop-engine/docs/candidate-primitives.md) would absorb this AD-shaped
// piecewise-quadratic-in-log cost ladder once it graduates.
function buildCrystalUpgrades(
  prestigeShards: Resource<DecimalSource>,
  rateChains: ModifierChain[],
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
        // Slim-port effect: per-level fractional bonus. Synergism's actual
        // crystal effects route through globalCoinMultiplier with per-upgrade
        // formulas (Variables.ts:131 onwards); the slim port collapses each
        // Crystal to a +CRYSTAL_PER_LEVEL_BONUS multiplicative-per-level grant
        // onto every prestige rateChain. Balance leaf will refine.
        effect: (a) => Decimal.add(1, Decimal.mul(a, CRYSTAL_PER_LEVEL_BONUS)),
      };
    },
    mapState: (def, purchasable) => {
      const amount = mirrors.get(def.id);
      if (!amount) throw new Error(`scaler/prestige: missing amount mirror for ${def.id}`);

      // Mirror purchasable.amount → external amount so the cost Formula
      // re-evaluates after each purchase. `flush: 'sync'` matches
      // createScalingPurchasable's discipline (purchasable.ts:722-728):
      // consumers read getCost(1) / canPurchase immediately after purchase()
      // returns, before Vue's default scheduler flushes.
      watch(
        () => purchasable.amount.value,
        (v) => {
          amount.value = v;
        },
        { immediate: true, flush: 'sync' },
      );

      // Per-level multiplicative grant onto every prestige rate chain.
      // Stays inline (rather than via mapPurchasable's `grants?: Grant[]`)
      // because the multiplier reads `purchasable.effect.value`, which is
      // only available post-construction.
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

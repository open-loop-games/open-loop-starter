import { watch } from 'vue';
import {
  Decimal,
  Formula,
  bn,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type ProducerCategory,
  type Purchasable,
  type PurchasableGroup,
  type Resource,
  createConversion,
  createCostRequirement,
  createLogFormula,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasable,
  createPurchasableGroup,
  createResource,
  persistent,
  withPersistentContext,
} from 'open-loop-engine';
import type { CrystalUpgradeDef, ProducerDef, ScalerData } from '../data/types';
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

export interface UpgradeRoster<Def extends { id: string }> {
  group: PurchasableGroup;
  entries: ReadonlyArray<{ def: Def; purchasable: Purchasable }>;
  getEntry: (id: string) => { def: Def; purchasable: Purchasable } | undefined;
}

export const CrystalUpgradesKey: InjectionKey<UpgradeRoster<CrystalUpgradeDef>> = Symbol(
  'scaler/prestige/crystal-upgrades',
) as InjectionKey<UpgradeRoster<CrystalUpgradeDef>>;

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

const CRYSTAL_PER_LEVEL_BONUS = 0.05;

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

      const rateChains = producers.getAll().map((entry) => entry.producer.rateChain);

      const crystalUpgrades = buildCrystalUpgrades(
        prestigeShards,
        tier.crystalUpgrades,
        rateChains,
      );

      ctx.provide(PrestigePointsKey, prestigePoints);
      ctx.provide(PrestigeShardsKey, prestigeShards);
      ctx.provide(PrestigeProducersKey, producers);
      ctx.provide(CrystalUpgradesKey, crystalUpgrades);
    },
    connect(ctx: EngineContext): void {
      // Conversion construction is deferred to connect() because it pairs
      // with prestigeReset (provided by scaler/resets.install). Engine
      // ordering: all install() runs, then all connect() runs in the same
      // topological order — by the time prestige.connect fires,
      // resets.install has provided every reset key.
      const coin = ctx.inject(AntimatterCoinKey);
      const reset = ctx.inject(PrestigeResetKey);
      const formula = createLogFormula(data.balance.prestigeConversionLog);
      const conversion = createConversion({
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
          reset.reset();
        },
      });
      ctx.provide(PrestigeConversionKey, conversion);
    },
  };
}

// vanilla canonical: SynergismOfficial/src/Buy.ts:657 (calculateCrystalBuy) +
// Buy.ts:689-694 (cost paid in prestigeShards):
//   cost(level=n) = 10^(baseLogCost + costIncrement * ((n - 0.5)^2 / 2 - 1/8))
// Cost grows super-exponentially in level (the exponent itself grows
// quadratically) — geometric `createScalingPurchasable` doesn't fit.
//
// TODO(expansion): `costScaling: { threshold, scale }` candidate (see
// open-loop-engine/docs/candidate-primitives.md) would absorb this AD-shaped
// piecewise-quadratic-in-log cost ladder once it graduates. Until then, this
// is the engine-prescribed shape: per-def raw createPurchasable with a
// Formula expression over an external amount mirror — same internal pattern
// as createScalingPurchasable (purchasable.ts:672-728), adapted for
// non-geometric cost. The mirror keeps the cost closure const-safe (no
// forward-declare workaround).
function buildCrystalUpgrades(
  prestigeShards: Resource<DecimalSource>,
  defs: CrystalUpgradeDef[],
  rateChains: ModifierChain[],
): UpgradeRoster<CrystalUpgradeDef> {
  const entries: { def: CrystalUpgradeDef; purchasable: Purchasable }[] = [];
  const purchasables: Purchasable[] = [];

  for (const def of defs) {
    // External amount mirror — same shape as createScalingPurchasable's
    // internal `scalingAmount` (purchasable.ts:672-676). Sub-context per
    // upgrade keeps persistence partitioned.
    const amount = withPersistentContext(`scaler/prestige/crystal:${def.id}`, () =>
      persistent<DecimalSource>(0, { name: 'amountMirror' }),
    );

    // Formula expression over the variable: 10 ^ (baseLogCost + costIncrement * ((n - 0.5)^2 / 2 - 1/8))
    const halfBack = Formula.variable(amount).sub(0.5);
    const exponent = halfBack.pow(2).div(2).sub(0.125).mul(def.costIncrement).add(def.baseLogCost);
    const cost = Formula.constant(10).pow(exponent);

    const purchasable = createPurchasable({
      id: def.id,
      display: { title: def.name, description: def.description },
      requirements: createCostRequirement({ resource: prestigeShards, cost }),
      // Slim-port effect: per-level fractional bonus. Synergism's actual
      // crystal effects route through globalCoinMultiplier with per-upgrade
      // formulas (Variables.ts:131 onwards); the slim port collapses each
      // Crystal to a +CRYSTAL_PER_LEVEL_BONUS multiplicative-per-level grant
      // onto every prestige rateChain. Balance leaf will refine.
      effect: (a) => Decimal.add(1, Decimal.mul(a, CRYSTAL_PER_LEVEL_BONUS)),
    });

    // Mirror purchasable.amount → external amount so the cost Formula
    // re-evaluates after each purchase. Same `flush: 'sync'` discipline as
    // createScalingPurchasable (consumers read getCost(1) immediately after
    // purchase() returns, before Vue's default scheduler flushes).
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

    purchasables.push(purchasable);
    entries.push({ def, purchasable });
  }

  const group = createPurchasableGroup({ purchasables });
  const byId = new Map(entries.map((e) => [e.def.id, e] as const));

  return {
    group,
    entries,
    getEntry: (id) => byId.get(id),
  };
}

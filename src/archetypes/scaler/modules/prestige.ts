import { unref, watch, type ComputedRef } from 'vue';
import {
  Decimal,
  Formula,
  addResource,
  bn,
  tunable,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type Gate,
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
import { ScalerTuningRegistryKey } from './tuning';

// === Cascade structure ===
//
// Diamond cascade: T(N).count = ownedN + generatedN. Each tier's tick
// emits `(owned + generated) × computedRate × dt` into the next-lower
// tier's generated resource (T1 emits to prestigeShards, the headline
// per-prestige currency). Acyclic — diamond canonical has no cyclic
// feedback edge analogous to antimatter's upgrade[105] T1.owned →
// T5.generated.
//
// vanilla canonical: SynergismOfficial/src/Synergism.ts:3206-3248 —
//   produceFifthDiamonds  = (T5.gen + T5.owned) × player.fifthProduceDiamonds × G.globalCrystalMultiplier
//   produceFourthDiamonds = (T4.gen + T4.owned) × player.fourthProduceDiamonds × G.globalCrystalMultiplier
//   ...
//   produceFirstDiamonds  = (T1.gen + T1.owned) × player.firstProduceDiamonds × G.globalCrystalMultiplier
//   T4.gen += produceFifthDiamonds  × (dt / 0.025)
//   T3.gen += produceFourthDiamonds × (dt / 0.025)
//   T2.gen += produceThirdDiamonds  × (dt / 0.025)
//   T1.gen += produceSecondDiamonds × (dt / 0.025)
//   prestigeShards += produceFirstDiamonds × (dt / 0.025)   // gated on not-in-Challenge-3/Reincarnation-10
//
// vanilla canonical (cost): SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts
//
// Slim adopts implicit-1 baseRate per tier — engine-native per-second rate
// (rate × count × dt → 1 unit of next-tier-generated per count per second).
// Canonical's `dt/0.025` factor is a tick-cadence normalization to per-25ms
// units; the slim engine's continuous-tick semantics absorb the conversion
// uniformly across tiers. Per-tier `firstProduceDiamonds` etc. are not
// constants in canonical (they are products of upgrade chains); slim's
// modifier-chain multipliers (Crystal grants) carry the equivalent
// per-tier amplification on top of implicit-1.
//
// Tick ordering (within-tick cascading vs. snapshot-then-apply): canonical
// diamond pre-snapshots all `produceXDiamonds` from prior values then
// applies the cascade, so T(N-1) sees pre-tick T(N) state within one
// tick. Engine's continuous-tick fires producers sequentially in
// registration order; T5..T1 registration gives within-tick cascading
// (T(N-1) sees the just-updated T(N).generated). Divergence is sub-leading
// O(dt) on per-tier counts — accepted uniformly across cascades for
// engine-natural ordering rather than asymmetric snapshot machinery.
//
// TODO(expansion): graduates the wire-up to a managed primitive once
// a second consumer hand-rolls the same generated-resource +
// extraCount + cascade-emission shape across ≥3 tiers. See
// `open-loop-engine/docs/candidate-primitives.md` § Producer cascade.
const DIAMOND_BASE_RATE: DecimalSource = 1;

// === Module ===

export function createPrestigeModule(data: ScalerData): EngineModule {
  const tier = data.prestige;

  let prestigePoints!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let prestigeShards!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let prestigeCount!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let generated!: Resource<DecimalSource>[];
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

      // Counts how many prestige conversions have fired. Discrete event
      // counter (no continuous tick adds), incremented in afterConvert
      // before reset.reset() runs. Survives reset via keep: so the
      // cumulative tracker accumulates across prestiges — read by
      // achievement Gate `cumulative-gte` for the prestige-count ladder.
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

      // Per-tier "generated" tally — same shape as antimatter cascade.
      // Lives in scaler/prestige scope so prestigeReset (which walks
      // 'scaler/prestige') zeroes them per prestige cycle alongside
      // prestigeShards. Five entries indexed [0..4] = positions [1..5].
      generated = [1, 2, 3, 4, 5].map((position) =>
        createResource<DecimalSource>(0, {
          precision: 0,
          id: `scaler/prestige/generated-${position}`,
        }),
      );

      producers = createProducerCategory<ProducerDef>({
        id: 'scaler/prestige/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => {
          const idx = def.position - 1;
          // Cascade emission: T(N>1) → generated[N-2]; T1 → prestigeShards.
          const target = idx === 0 ? prestigeShards : generated[idx - 1]!;
          const own = generated[idx]!;
          return {
            resource: target,
            baseRate: DIAMOND_BASE_RATE,
            trigger: 'continuous',
            display: def.name,
            extraCount: () => own.value,
            purchase: {
              // Diamond producers cost prestigePoints — the cumulative-across-
              // prestige currency. Players save up prestigePoints over many
              // prestiges to afford higher-tier diamond producers.
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

      // Capability gate: "prestige produces a non-zero gain right now."
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:4784 —
      //   coinsThisPrestige.gte(1e16) gates auto-prestige firing in mode 1.
      // Slim-port equivalent: the floor of `floor(log_{prestigeConversionLog}
      // (coin + 1))` first returns ≥ 1 at `coin == prestigeConversionLog`
      // (1e25 per data.balance). Reads through coin's intrinsic `cumulative`
      // slot — coin sits in the antimatter scope which prestigeReset walks,
      // so cumulative resets on each prestige and tracks "earned this cycle"
      // (autobuyer spends can dip coin.value below threshold mid-cycle, but
      // cumulative is monotonic-within-cycle).
      const canResetGate: Gate = {
        kind: 'cumulative-gte',
        resource: 'scaler/coins',
        value: data.balance.prestigeConversionLog,
      };

      // Module-scoped reset. resetModules walks both antimatter + prestige
      // persistent contexts; the keep set exempts the cumulative currency
      // the conversion just incremented (without it, afterConvert →
      // reset.reset() would zero the gain that was written one step
      // earlier — conversion.ts:204-211) plus its `cumulative` tracker
      // (which Gate `cumulative-gte` reads for amount-ladder achievements;
      // resetting it would break the "prestige points gained total"
      // semantics) and the prestigeCount resource + its tracker (the
      // count survives across prestiges by construction).
      const prestigeReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige'],
        canReset: canResetGate,
        keep: [
          prestigePoints,
          prestigePoints.cumulative!,
          prestigeCount,
          prestigeCount.cumulative!,
        ],
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
          // Increment count BEFORE reset.reset(): the reset sets
          // loadingSave=true around its scope walk, which suppresses the
          // cumulative-tracker watcher (resource.ts:203). Incrementing
          // outside the reset window keeps cumulative in lockstep with
          // value, and the keep: above protects both refs from cleanup.
          addResource(prestigeCount, 1);
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
        // Slim-port effect: per-level fractional bonus. Synergism's actual
        // crystal effects route through globalCoinMultiplier with per-upgrade
        // formulas (Variables.ts:131 onwards); the slim port collapses each
        // Crystal to a uniform per-level multiplicative grant onto every
        // prestige rateChain. The per-level bonus is solver-tunable via
        // ScalerTuningRegistryKey under `modules/prestige/CRYSTAL_PER_LEVEL_BONUS`.
        effect: (a) => Decimal.add(1, Decimal.mul(a, unref(crystalPerLevelBonus))),
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

import { unref, watch, type ComputedRef } from 'vue';
import {
  Decimal,
  Formula,
  addResource,
  createOverrideRegistry,
  tunable,
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
import { ScalerTuningRegistryKey, type ScalerTunables } from './tuning';

// === Cascade structure ===
//
// Antimatter cascade: T(N).count = ownedN + generatedN. Each tier's tick
// emits `(owned + generated) × computedRate × dt` into the next-lower
// tier's generated resource (T1 emits to coin, the headline currency).
// Plus the cyclic feedback edge T1.ownedCount → T5.generated (canonical
// upgrade[105] in Synergism, always-on in slim — see § Always-on cascade
// below).
//
// vanilla canonical: SynergismOfficial/src/Synergism.ts:4370-4404 —
//   T4.gen += (T5.gen + T5.owned) × G.uFifteenMulti × G.generatorPower
//   T3.gen += (T4.gen + T4.owned) × G.uFourteenMulti × G.generatorPower
//   T2.gen += (T3.gen + T3.owned) × G.generatorPower
//   T1.gen += (T2.gen + T2.owned) × G.generatorPower
//   T5.gen += T1.owned                                 // cyclic edge
//
// vanilla canonical (cost): SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts
//
// Slim adopts implicit-1 baseRate per tier (rate × count × dt → 1 unit of
// next-tier-generated per count per second). Canonical lacks per-tier
// baseRate constants; the cascade structure itself plus modifier-chain
// multipliers (Accelerator, Multiplier, Crystal grants) carry pacing.
// Per-second slim convention diverges from canonical's per-25ms-tick
// implicit cadence — a 40× factor in raw rate that the declared-invention
// multiplier surface (acceleratorPerLevelMult, MULTIPLIER_PER_LEVEL,
// achievementMultiplier, CRYSTAL_PER_LEVEL_BONUS) absorbs at sub-leaf D
// arc-fit. The previous slim shape (flat per-tier rates 0.1..8000)
// dropped the cascade entirely — replacing those with implicit-1 here
// is a *reduction* in slim invention.
//
// === Always-on cascade ===
//
// Canonical antimatter cascade is gated behind shop upgrades 101-105
// (each unlocks one tier of cascade). Slim port omits the shop per
// `archetypes/scaler.md § 5 substrate divergences`, so the cascade
// is always-on from t=0. This is symmetric with the diamond cascade
// (which is always-on in canonical too — Synergism.ts:3206-3248) and
// matches the shop-omitted substrate without inventing replacement
// gate content. The pacing arc the canonical shop gates would create
// is absorbed by sub-leaf D's arc-fit calibration.
//
// TODO(expansion): graduates the wire-up to a managed primitive once
// a second consumer hand-rolls the same generated-resource +
// extraCount + cascade-emission shape across ≥3 tiers. See
// `open-loop-engine/docs/candidate-primitives.md` § Producer cascade.
const PRODUCER_BASE_RATE: DecimalSource = 1;

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
// constants approximate the early-game payout shape.
//
// `accelerator` is a declared invention (per `balance/shape.ts`
// SCALER_SUBSYSTEMS antimatter inventionKnobs) and routes through
// ScalerTuningRegistryKey so the balance solver can bisect it without
// rebuilding the engine per iteration. `multiplier` stays static — the 2×
// per-level shape is a slim-port choice tied to the rate-chain composition,
// not a tunable beat-fire knob.
const MULTIPLIER_PER_LEVEL: DecimalSource = 2;

// === Module ===

export function createAntimatterModule(data: ScalerData): EngineModule {
  const tier = data.antimatter;

  let coin!: Resource<DecimalSource>;
  let generated!: Resource<DecimalSource>[];
  let producers!: ProducerCategory<ProducerDef>;
  let upgrades!: PurchasableCategory<AntimatterUpgradeDef>;

  return {
    id: 'scaler/antimatter',
    install(ctx: EngineContext): void {
      // First-installed scaler tier owns the tuning registry. Sibling
      // modules (prestige, transcend, achievements) inject and wrap their
      // declared-invention knobs via `tunable(...)`. Mirrors producer's
      // `ProducerTuningRegistryKey` shape.
      const tuningRegistry = createOverrideRegistry<ScalerTunables>('scaler-tuning');
      ctx.provide(ScalerTuningRegistryKey, tuningRegistry);

      const acceleratorPerLevelMult = tunable<DecimalSource>(
        tuningRegistry,
        'modules/antimatter/UPGRADE_PER_LEVEL_MULT/accelerator',
        () => 1.05,
      );

      // vanilla canonical: SynergismOfficial/src/Synergism.ts:250 —
      //   coins: new Decimal('1e2')
      // Bootstrap grant: the cheapest producer (Worker) costs 100 coins, so
      // a 0-coin start hardlocks the player. Synergism seeds the same amount.
      coin = createResource<DecimalSource>('1e2', {
        displayName: 'Coins',
        precision: 0,
        id: 'scaler/coins',
      });

      // Per-tier "generated" tally — the cascade-feed counterpart to
      // each producer's owned amount. T(N).extraCount reads
      // generated[N-1].value so its tick output reflects (owned + generated).
      // T(N>1)'s emission targets generated[N-2] (the next-lower tier);
      // T1's emission targets coin. Lives in scaler/antimatter scope so
      // prestigeReset (which walks 'scaler/antimatter') zeroes them per
      // prestige cycle. Five entries indexed [0..4] = positions [1..5].
      generated = [1, 2, 3, 4, 5].map((position) =>
        createResource<DecimalSource>(0, {
          precision: 0,
          id: `scaler/antimatter/generated-${position}`,
        }),
      );

      producers = createProducerCategory<ProducerDef>({
        id: 'scaler/antimatter/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => {
          const idx = def.position - 1;
          // Cascade emission: T(N>1).resource = generated[N-2]; T1.resource = coin.
          const target = idx === 0 ? coin : generated[idx - 1]!;
          // Cascade-feed: T(N).extraCount reads its own generated tally.
          const own = generated[idx]!;
          return {
            resource: target,
            baseRate: PRODUCER_BASE_RATE,
            trigger: 'continuous',
            display: def.name,
            extraCount: () => own.value,
            purchase: {
              costResource: coin,
              baseCost: def.baseCost,
              // Within-tier cost ramp. Per-tier baseCost gap from Synergism
              // (100 → 1e3 → 2e4 → 4e5 → 8e6) does the heavy lifting for tier
              // separation; per-buy ramp keeps tier-level pacing.
              costScaling: 1.15,
            },
          };
        },
      });
      producers.register(tier.producers);

      // Cyclic feedback edge: T5.generated += T1.ownedCount × dt.
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:4401-4404 —
      //   if (player.upgrades[105] > 0.5) {
      //     player.fifthGeneratedCoin = player.fifthGeneratedCoin
      //       .add(player.firstOwnedCoin)
      //   }
      // Canonical fires per 25ms tick with no dt scaling (effectively
      // T1.ownedCount × 40 per second of sim time). Slim per-second
      // convention takes the implicit-1 form `T1.ownedCount × dt` per
      // tick — the 40× canonical factor is a tick-cadence artifact, not
      // a structural piece, and gets absorbed by the declared-invention
      // multiplier surface at arc-fit. Always-on per the shop-omitted
      // substrate (canonical gates this behind upgrade[105]). Registered
      // after producers.register() so it fires after the per-tier cascade
      // ticks within the same sequencer pass — matches canonical ordering
      // (cascade first, then cyclic add).
      const t1 = producers.getEntry('antimatter-1')!.producer;
      const t5Generated = generated[4]!;
      ctx.onTick((dt) => {
        const owned = t1.ownedCount.value;
        if (Decimal.gt(owned, 0)) {
          addResource(t5Generated, Decimal.mul(owned, dt));
        }
      });

      upgrades = buildUpgrades(coin, producers, acceleratorPerLevelMult);
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
  acceleratorPerLevelMult: ComputedRef<DecimalSource>,
): PurchasableCategory<AntimatterUpgradeDef> {
  const mirrors = new Map<string, Persistent<DecimalSource>>();

  return createPurchasableCategory<AntimatterUpgradeDef>({
    id: 'scaler/antimatter/upgrades',
    mapPurchasable: (def) => {
      const amount = persistent<DecimalSource>(0, { name: 'amountMirror' });
      mirrors.set(def.id, amount);

      const costScaling = UPGRADE_COST_SCALING[def.id] ?? 1;
      const cost = Formula.exponential(amount, def.baseCost, costScaling);

      // accelerator is the declared-invention knob (see balance/shape.ts);
      // multiplier stays a fixed slim-port shape.
      const effect: (a: DecimalSource) => DecimalSource =
        def.id === 'accelerator'
          ? (a) => Decimal.pow(unref(acceleratorPerLevelMult), a)
          : (a) => Decimal.pow(MULTIPLIER_PER_LEVEL, a);

      return {
        display: { title: def.name, description: def.description },
        requirements: createCostRequirement({ resource: coin, cost }),
        effect,
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

import {
  Decimal,
  type ChallengeCategory,
  type ChallengeDef as EngineChallengeDef,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  type ProducerCategory,
  type Purchasable,
  type Resource,
  createChallengeCategory,
  createCumulativeConversion,
  createLogFormula,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableGroup,
  createResource,
  createScalingPurchasable,
} from 'open-loop-engine';
import type {
  ChallengeDef as ScalerChallengeDef,
  ProducerDef,
  ScalerData,
  TranscendUpgradeDef,
} from '../data/types';
import {
  AntimatterAcceleratorKey,
  AntimatterMultiplierKey,
  AntimatterProducersKey,
} from './antimatter';
import { PrestigePointsKey, PrestigeProducersKey, PrestigeShardsKey } from './prestige';
import { TranscendResetKey } from './resets';
import type { UpgradeRoster } from './prestige';

// === Injection keys ===

export const TranscendPointsKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'scaler/transcend/points',
) as InjectionKey<Resource<DecimalSource>>;

export const TranscendShardsKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'scaler/transcend/shards',
) as InjectionKey<Resource<DecimalSource>>;

export const TranscendProducersKey: InjectionKey<ProducerCategory<ProducerDef>> = Symbol(
  'scaler/transcend/producers',
) as InjectionKey<ProducerCategory<ProducerDef>>;

export const AcceleratorBoostKey: InjectionKey<Purchasable> = Symbol(
  'scaler/transcend/accelerator-boost',
) as InjectionKey<Purchasable>;

export const TranscendUpgradesKey: InjectionKey<UpgradeRoster<TranscendUpgradeDef>> = Symbol(
  'scaler/transcend/upgrades',
) as InjectionKey<UpgradeRoster<TranscendUpgradeDef>>;

// Engine ChallengeDef carries the engine-side fields (overrides, grants,
// reset hooks); the scaler challenge def lives in data and threads through
// `mapChallenge` below. The injection key exposes the engine-side category
// instance so UI / sim can drive enter / complete / progress display.
export const ChallengesKey: InjectionKey<ChallengeCategory<EngineChallengeDef>> = Symbol(
  'scaler/transcend/challenges',
) as InjectionKey<ChallengeCategory<EngineChallengeDef>>;

// vanilla canonical: SynergismOfficial/src/Calculate.ts:2460 —
//   transcendPointGain = floor(log_{10}(prestigeShards + 1))
// Conversion adds gain to cumulative transcendPoints, then transcendReset
// zeroes prestige + antimatter scopes per Reset.ts:480-536.
export const TranscendConversionKey: InjectionKey<Conversion> = Symbol(
  'scaler/transcend/conversion',
) as InjectionKey<Conversion>;

// === Slim-port balance constants ===
//
// Mythos producers generate transcendShards. Same cascade-omitted shape as
// antimatter / prestige. Synergism's mythos cascade is at Synergism.ts:3250.
//
// vanilla canonical (cost): SynergismOfficial/src/Buy.ts:338 —
// mythosAndParticleBuildingCosts
const MYTHOS_BASE_RATES: Record<string, DecimalSource> = {
  'transcend-1': '0.01',
  'transcend-2': '1',
  'transcend-3': '50',
  'transcend-4': '5e3',
  'transcend-5': '5e7',
};

// vanilla canonical: SynergismOfficial/src/Reset.ts:498-499 —
// player.acceleratorBoostCost = 1e3 initial; cost grows by 10x per level
// plus an additional 10^acceleratorBoostBought multiplier (Buy.ts:705
// boostAccelerator branch). Slim port treats it as a flat geometric
// 10x-per-level for the simplified shape.
const ACCELERATOR_BOOST_COST_SCALING = 10;

// Per-bought-level multiplier into the antimatter rate chains. Synergism
// at Variables.ts: acceleratorBoost contributes acceleratorEffect = 1.01 ^
// (acceleratorBoostBought * acceleratorEffectMultipliers). Slim port uses
// a flat 1.05^level into both antimatter rate chains AND a soft buff to
// the transcend chains (matches Synergism's secondary mythos boost path).
const ACCELERATOR_BOOST_PER_LEVEL_MULT = 1.05;

// Per-level multiplier for the slim-port transcend upgrades. Real Synergism
// upgrades 100-103 are per-upgrade specialized formulas; the slim port
// flattens to a uniform per-level grant per upgrade.
const TRANSCEND_UPGRADE_PER_LEVEL_MULT = 1.1;

// Per-level local cost ramp for the slim-port transcend upgrades. Synergism's
// upgradeCosts table grows ~1000x per upgrade slot (Variables.ts:27), but
// each individual upgrade is one-shot in the source. Slim port lets you buy
// multiple levels with a 10x-per-level local ramp on top of the data-pinned
// baseCost.
const TRANSCEND_UPGRADE_COST_SCALING = 10;

// === Module ===

export function createTranscendModule(data: ScalerData): EngineModule {
  const tier = data.transcend;
  let transcendPoints!: Resource<DecimalSource>;

  return {
    id: 'scaler/transcend',
    dependencies: ['scaler/prestige'],
    install(ctx: EngineContext): void {
      transcendPoints = createResource<DecimalSource>(0, {
        displayName: 'Transcend Points',
        precision: 2,
        id: 'scaler/transcend-points',
      });

      const transcendShards = createResource<DecimalSource>(0, {
        displayName: 'Transcend Shards',
        precision: 2,
        id: 'scaler/transcend-shards',
      });

      const producers = createProducerCategory<ProducerDef>({
        id: 'scaler/transcend/producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: transcendShards,
          baseRate: MYTHOS_BASE_RATES[def.id] ?? 0,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            costResource: transcendPoints,
            baseCost: def.baseCost,
            costScaling: 1.5,
          },
        }),
      });
      producers.register(tier.producers);

      const transcendRateChains = producers.getAll().map((entry) => entry.producer.rateChain);
      const antimatterProducers = ctx.inject(AntimatterProducersKey);
      const antimatterRateChains = antimatterProducers
        .getAll()
        .map((entry) => entry.producer.rateChain);
      const prestigeProducers = ctx.inject(PrestigeProducersKey);
      const prestigeRateChains = prestigeProducers
        .getAll()
        .map((entry) => entry.producer.rateChain);

      // Acc Boost — cross-currency upgrade. Lives at Transcend tier but
      // costs prestigePoints (Reset.ts:498-499, Buy.ts:705). Boosts every
      // antimatter rate chain.
      //
      // The cross-currency case is just a parameter on createScalingPurchasable's
      // `resource` field — pass prestigePoints as the spend source. No new
      // primitive needed (per OL-823 triage).
      const prestigePoints = ctx.inject(PrestigePointsKey);
      const acceleratorBoost = buildAcceleratorBoost({
        def: findUpgrade(tier.upgrades, 'acc-boost'),
        prestigePoints,
        antimatterRateChains,
      });

      const upgrades = buildTranscendUpgrades({
        defs: tier.upgrades.filter((u) => u.id !== 'acc-boost'),
        transcendPoints,
        rateChains: transcendRateChains,
      });

      const antimatterAccelerator = ctx.inject(AntimatterAcceleratorKey);
      const antimatterMultiplier = ctx.inject(AntimatterMultiplierKey);
      const challenges = buildChallenges({
        defs: tier.challenges,
        rewardCoefficient: data.balance.challengeCompletionMultiplier,
        antimatterRateChains,
        prestigeRateChains,
        transcendRateChains,
        acceleratorEffect: () => antimatterAccelerator.effect.value,
        multiplierEffect: () => antimatterMultiplier.effect.value,
      });

      ctx.provide(TranscendPointsKey, transcendPoints);
      ctx.provide(TranscendShardsKey, transcendShards);
      ctx.provide(TranscendProducersKey, producers);
      ctx.provide(AcceleratorBoostKey, acceleratorBoost);
      ctx.provide(TranscendUpgradesKey, upgrades);
      ctx.provide(ChallengesKey, challenges);
    },
    connect(ctx: EngineContext): void {
      const prestigeShards = ctx.inject(PrestigeShardsKey);
      const reset = ctx.inject(TranscendResetKey);
      const conversion = createCumulativeConversion({
        baseResource: prestigeShards,
        gainResource: transcendPoints,
        formula: createLogFormula(data.balance.transcendConversionLog),
        reset,
      });
      ctx.provide(TranscendConversionKey, conversion);
    },
  };
}

function findUpgrade(upgrades: TranscendUpgradeDef[], id: string): TranscendUpgradeDef {
  const def = upgrades.find((u) => u.id === id);
  if (!def) throw new Error(`scaler/transcend: missing upgrade definition "${id}"`);
  return def;
}

interface BuildAcceleratorBoostOptions {
  def: TranscendUpgradeDef;
  prestigePoints: Resource<DecimalSource>;
  antimatterRateChains: ModifierChain[];
}

function buildAcceleratorBoost(opts: BuildAcceleratorBoostOptions): Purchasable {
  const { def, prestigePoints, antimatterRateChains } = opts;
  if (def.costCurrency !== 'prestigePoints') {
    throw new Error(`scaler/transcend: acc-boost expected costCurrency='prestigePoints'`);
  }

  const purchasable = createScalingPurchasable({
    id: def.id,
    title: def.name,
    description: def.description,
    resource: prestigePoints,
    baseCost: def.baseCost,
    costScaling: ACCELERATOR_BOOST_COST_SCALING,
    effect: (amount: DecimalSource) => Decimal.pow(ACCELERATOR_BOOST_PER_LEVEL_MULT, amount),
  });

  for (const chain of antimatterRateChains) {
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

interface BuildTranscendUpgradesOptions {
  defs: TranscendUpgradeDef[];
  transcendPoints: Resource<DecimalSource>;
  rateChains: ModifierChain[];
}

// Per-def createScalingPurchasable + createPurchasableGroup. Geometric cost
// (def.baseCost · 10^level) + per-def post-creation chain.bind closing over
// the purchasable's live effect. PurchasableCategory's mapPurchasable can't
// natively express "geometric cost varying per-def by baseCost" without a
// forward-declared category reference, so per-def raw createScalingPurchasable
// + group is the correct shape here.
function buildTranscendUpgrades(
  opts: BuildTranscendUpgradesOptions,
): UpgradeRoster<TranscendUpgradeDef> {
  const { defs, transcendPoints, rateChains } = opts;
  const entries: { def: TranscendUpgradeDef; purchasable: Purchasable }[] = [];
  const purchasables: Purchasable[] = [];

  for (const def of defs) {
    const purchasable = createScalingPurchasable({
      id: def.id,
      title: def.name,
      description: def.description,
      resource: transcendPoints,
      baseCost: def.baseCost,
      costScaling: TRANSCEND_UPGRADE_COST_SCALING,
      effect: (amount: DecimalSource) => Decimal.pow(TRANSCEND_UPGRADE_PER_LEVEL_MULT, amount),
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

interface BuildChallengesOptions {
  defs: ScalerChallengeDef[];
  rewardCoefficient: DecimalSource;
  antimatterRateChains: ModifierChain[];
  prestigeRateChains: ModifierChain[];
  transcendRateChains: ModifierChain[];
  acceleratorEffect: () => DecimalSource;
  multiplierEffect: () => DecimalSource;
}

// Engine challenge category: 5 transcend challenges. While active, the
// challenge nerfs production via `restricts`. Per-completion stacking
// reward feeds back through `rewards` Grants whose multiplier is a
// computed reading the per-challenge `completions.value`. The scaler data
// challenge type carries scaler-side text fields that aren't in the
// engine ChallengeDef shape — we map them through to the engine def at
// registration.
//
// vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC):
//   ecc = floor(linear-with-completions softcapped past N)
// Slim port linearizes per-completion stacking: rewards apply
// `1 + balance.challengeCompletionMultiplier * completions` into the
// targeted chain. Restricts apply hand-picked per-challenge nerfs aligned
// with each Synergism challenge's flavor (disable Accelerator, halve
// prestige rate, raise costs, etc.).
function buildChallenges(opts: BuildChallengesOptions): ChallengeCategory<EngineChallengeDef> {
  const {
    defs,
    rewardCoefficient,
    antimatterRateChains,
    prestigeRateChains,
    transcendRateChains,
    acceleratorEffect,
    multiplierEffect,
  } = opts;

  const category = createChallengeCategory<EngineChallengeDef>({
    id: 'scaler/transcend/challenges',
    mutuallyExclusive: true,
  });

  for (const def of defs) {
    const restricts = restrictsFor(def, {
      antimatterRateChains,
      prestigeRateChains,
      acceleratorEffect,
      multiplierEffect,
    });
    const rewards = rewardsFor(def, {
      antimatterRateChains,
      prestigeRateChains,
      transcendRateChains,
      rewardCoefficient,
      completions: () => category.getChallenge(def.id)?.completions.value ?? 0,
    });

    category.register({
      id: def.id,
      name: def.name,
      restricts,
      rewards,
    });
  }

  return category;
}

interface RestrictsContext {
  antimatterRateChains: ModifierChain[];
  prestigeRateChains: ModifierChain[];
  acceleratorEffect: () => DecimalSource;
  multiplierEffect: () => DecimalSource;
}

// Slim-port challenge restricts. Each maps Synergism's in-challenge nerfs
// to chain-bound multiplicative modifiers active during the challenge run.
// The Grant lower-er auto-binds with `challenge.active` as the implicit
// predicate (challenge-category.ts:478).
function restrictsFor(def: ScalerChallengeDef, ctx: RestrictsContext): Grant[] {
  switch (def.id) {
    case 'challenge-1':
      // vanilla canonical: SynergismOfficial/src/Challenges.ts:209-213 —
      // Accelerators and Multipliers disabled. Slim port nullifies their
      // contribution by binding 1/effect onto every antimatter chain (the
      // upgrades' own grants are still in the chain, so binding the
      // inverse cancels them out for the duration of the challenge).
      return [
        {
          chain: ctx.antimatterRateChains,
          mult: () => Decimal.div(1, ctx.acceleratorEffect()),
          description: 'C1: Accelerator disabled',
        },
        {
          chain: ctx.antimatterRateChains,
          mult: () => Decimal.div(1, ctx.multiplierEffect()),
          description: 'C1: Multiplier disabled',
        },
      ];
    case 'challenge-2':
      // vanilla canonical: Challenges.ts:215-218 — prestige-tier buildings
      // produce 80% less. Slim port: ×0.2 on prestige rate chains.
      return [
        {
          chain: ctx.prestigeRateChains,
          mult: 0.2,
          description: 'C2: Prestige producers ×0.2',
        },
      ];
    case 'challenge-3':
      // vanilla canonical: Challenges.ts:220-224 — building production
      // halved. Slim port: ×0.5 on antimatter rate chains.
      return [
        {
          chain: ctx.antimatterRateChains,
          mult: 0.5,
          description: 'C3: Antimatter producers ×0.5',
        },
      ];
    case 'challenge-4':
      // vanilla canonical: Challenges.ts:226-230 — Accelerators capped /
      // weak; Multipliers weakened. Slim-port composite ×0.3 on antimatter.
      return [
        {
          chain: ctx.antimatterRateChains,
          mult: 0.3,
          description: 'C4: Acceleration locked (×0.3)',
        },
      ];
    case 'challenge-5':
      // vanilla canonical: Challenges.ts:232-236 — accelerator base halved,
      // multiplier costs raised, prestige gain reduced. Slim-port composite.
      return [
        {
          chain: ctx.antimatterRateChains,
          mult: 0.5,
          description: 'C5: Trial — antimatter ×0.5',
        },
        {
          chain: ctx.prestigeRateChains,
          mult: 0.5,
          description: 'C5: Trial — prestige ×0.5',
        },
      ];
    default:
      return [];
  }
}

interface RewardsContext {
  antimatterRateChains: ModifierChain[];
  prestigeRateChains: ModifierChain[];
  transcendRateChains: ModifierChain[];
  rewardCoefficient: DecimalSource;
  completions: () => number;
}

// Slim-port rewards. Each completion adds `rewardCoefficient` to a
// multiplier on the per-challenge target chain. Synergism's per-challenge
// reward formula varies (Challenges.ts:210-235 per case), so the slim
// port assigns each challenge a thematic target chain and stacks linearly.
function rewardsFor(def: ScalerChallengeDef, ctx: RewardsContext): Grant[] {
  const linearStack = (chain: ModifierChain | ModifierChain[], description: string): Grant => ({
    chain,
    mult: () => Decimal.add(1, Decimal.mul(ctx.completions(), ctx.rewardCoefficient)),
    description,
  });

  switch (def.id) {
    case 'challenge-1':
      // vanilla canonical: Challenges.ts:210-212 — completion grants ×2
      // Prestige Points gain. Slim-port routes per-completion stacking
      // into the prestige rate chain (closest analog to Prestige Points
      // gain in the rate-based slim port).
      return [linearStack(ctx.prestigeRateChains, 'C1 reward: prestige rate')];
    case 'challenge-2':
      // vanilla canonical: Challenges.ts:215-217 — ×5 prestige + ×5
      // Accelerator. Slim port: stack onto antimatter chain (where
      // Accelerator effect lands).
      return [linearStack(ctx.antimatterRateChains, 'C2 reward: antimatter rate')];
    case 'challenge-3':
      // vanilla canonical: Challenges.ts:220-223 — flat bonus + ECC
      // additions to Accelerator/Multiplier. Slim-port routes into the
      // antimatter chain.
      return [linearStack(ctx.antimatterRateChains, 'C3 reward: antimatter rate')];
    case 'challenge-4':
      // vanilla canonical: Challenges.ts:226-229 — ×5 prestige + ×2
      // Accelerator + ×0.5 Multiplier. Slim-port stacks onto prestige
      // chain (the dominant reward target).
      return [linearStack(ctx.prestigeRateChains, 'C4 reward: prestige rate')];
    case 'challenge-5':
      // vanilla canonical: Challenges.ts:232-235 — prestige modifier +
      // 10^ECC coin scaling + ×5 mythos production. Slim-port grants onto
      // transcend chain (the layer where mythos production lives).
      return [linearStack(ctx.transcendRateChains, 'C5 reward: transcend rate')];
    default:
      return [];
  }
}

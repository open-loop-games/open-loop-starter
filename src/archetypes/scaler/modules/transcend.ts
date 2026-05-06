import { unref, watch, type ComputedRef } from 'vue';
import {
  CategoriesKey,
  Decimal,
  Formula,
  ResourceRegistryKey,
  addResource,
  bn,
  tunable,
  type ChallengeCategory,
  type ChallengeDef as EngineChallengeDef,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type Gate,
  type Grant,
  type ModifierChain,
  type Persistent,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
  createChallengeCategory,
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
import type {
  ChallengeDef as ScalerChallengeDef,
  ProducerDef,
  ScalerData,
  TranscendUpgradeDef,
} from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';
import { ScalerTuningRegistryKey } from './tuning';

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

// vanilla canonical (acc-boost): SynergismOfficial/src/Variables.ts —
// acceleratorBoost contributes acceleratorEffect = 1.01 ^ (acceleratorBoostBought
// * acceleratorEffectMultipliers). Slim port uses 1.05^level for acc-boost,
// solver-tunable via ScalerTuningRegistryKey under
// `modules/transcend/UPGRADE_PER_LEVEL_MULT/acc-boost`. Other upgrades fall
// through to TRANSCEND_UPGRADE_DEFAULT_PER_LEVEL_MULT (1.1).
//
// Synergism upgrades 100-103 are per-upgrade specialized formulas; the slim
// port flattens to a uniform per-level grant per upgrade. Default is
// solver-tunable via `modules/transcend/TRANSCEND_UPGRADE_DEFAULT_PER_LEVEL_MULT`.
//
// Per-level local cost ramp: Synergism's `acceleratorBoostCost` grows by 10×
// per level (Buy.ts:705 boostAccelerator branch); transcend upgrades 100-103
// grow per Variables.ts:27 — 1e3, 1e6, 1e9, 1e12. Slim port lets you buy
// multiple levels with a 10×-per-level local ramp on top of the data-pinned
// baseCost; ramp is solver-tunable via `modules/transcend/UPGRADE_COST_SCALING`.

// === Module ===

export function createTranscendModule(data: ScalerData): EngineModule {
  const tier = data.transcend;

  let transcendPoints!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let transcendShards!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let transcendCount!: Resource<DecimalSource> & Persistent<DecimalSource>;
  let producers!: ProducerCategory<ProducerDef>;
  let upgrades!: PurchasableCategory<TranscendUpgradeDef>;
  let challenges!: ChallengeCategory<EngineChallengeDef>;

  return {
    id: 'scaler/transcend',
    dependencies: ['scaler/prestige'],
    install(ctx: EngineContext): void {
      transcendPoints = createResource<DecimalSource>(0, {
        displayName: 'Transcend Points',
        precision: 2,
        id: 'scaler/transcend-points',
      });

      transcendShards = createResource<DecimalSource>(0, {
        displayName: 'Transcend Shards',
        precision: 2,
        id: 'scaler/transcend-shards',
      });

      // Counts how many transcension conversions have fired. Same shape as
      // prestigeCount — discrete event counter incremented in afterConvert
      // before reset.reset(); survives the reset via keep: so its
      // `cumulative` tracker accumulates across transcensions.
      transcendCount = createResource<DecimalSource>(0, {
        displayName: 'Transcensions',
        precision: 0,
        id: 'scaler/transcend-count',
      });

      const tuningRegistry = ctx.inject(ScalerTuningRegistryKey);
      const accBoostPerLevelMult = tunable<DecimalSource>(
        tuningRegistry,
        'modules/transcend/UPGRADE_PER_LEVEL_MULT/acc-boost',
        () => 1.05,
      );
      const transcendDefaultPerLevelMult = tunable<DecimalSource>(
        tuningRegistry,
        'modules/transcend/TRANSCEND_UPGRADE_DEFAULT_PER_LEVEL_MULT',
        () => 1.1,
      );
      const upgradeCostScaling = tunable<DecimalSource>(
        tuningRegistry,
        'modules/transcend/UPGRADE_COST_SCALING',
        () => 10,
      );

      producers = createProducerCategory<ProducerDef>({
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

      // Cross-tier reads at install time: antimatter.install + prestige.install
      // have run by now (dep ordering). Their categories auto-registered into
      // CategoriesKey, and their resources auto-registered into
      // ResourceRegistryKey — both engine-pre-provided surfaces, no per-key
      // injection needed.
      const cats = ctx.inject(CategoriesKey);
      const registry = ctx.inject(ResourceRegistryKey);

      const prestigePoints = findResourceById(registry.list(), 'scaler/prestige-points');
      const antimatterProducers = findCategoryById(
        cats.producers ?? [],
        'scaler/antimatter/producers',
      );
      const prestigeProducers = findCategoryById(cats.producers ?? [], 'scaler/prestige/producers');
      const antimatterUpgrades = findCategoryById(
        cats.purchasables ?? [],
        'scaler/antimatter/upgrades',
      );

      const antimatterRateChains = antimatterProducers
        .getAll()
        .map((entry: { producer: { rateChain: ModifierChain } }) => entry.producer.rateChain);
      const prestigeRateChains = prestigeProducers
        .getAll()
        .map((entry: { producer: { rateChain: ModifierChain } }) => entry.producer.rateChain);
      const transcendRateChains = producers.getAll().map((entry) => entry.producer.rateChain);

      // acc-boost + 4 transcend upgrades all live in one category. Per-def
      // costCurrency picks the cost resource; per-def id picks the chain
      // target (acc-boost lifts antimatter, others lift transcend).
      upgrades = buildTranscendUpgrades({
        transcendPoints,
        prestigePoints,
        antimatterRateChains,
        transcendRateChains,
        accBoostPerLevelMult,
        transcendDefaultPerLevelMult,
        upgradeCostScaling,
      });
      upgrades.register(tier.upgrades);

      const accelerator = antimatterUpgrades.getEntry('accelerator')?.purchasable;
      const multiplier = antimatterUpgrades.getEntry('multiplier')?.purchasable;
      if (!accelerator || !multiplier) {
        throw new Error('scaler/transcend: antimatter accelerator/multiplier missing');
      }

      const challengeCompletionMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/challengeCompletionMultiplier',
        () => data.balance.challengeCompletionMultiplier,
      );

      // Per-challenge declared-invention threshold base. Canonical scaling
      // (Variables.ts:121: [10,20,60,100,200]) assumes Reincarnation+ stack
      // absent in slim — sub-leaf E (OL-859) pins via closed-form sweep.
      const challengeBaseRequirement = (def: ScalerChallengeDef) =>
        tunable<DecimalSource>(
          tuningRegistry,
          `modules/transcend/CHALLENGE_BASE_REQUIREMENT/${def.id}`,
          () => def.baseRequirement,
        );

      // Uniform completion cap per challenge — canonical Synergism's
      // `getMaxChallenges` returns the same value for transcend tier i<=5
      // (Challenges.ts:60-72). Slim-scaled placeholder for the 6-12h arc:
      // 5 challenges × 10 completions × ~7-14min/completion ≈ 6-12h.
      // Sub-leaf E pins.
      const challengeCompletionLimit = tunable<DecimalSource>(
        tuningRegistry,
        'modules/transcend/CHALLENGE_COMPLETION_LIMIT',
        () => 10,
      );

      const coin = findResourceById(registry.list(), 'scaler/coins');

      challenges = buildChallenges({
        defs: tier.challenges,
        rewardCoefficient: challengeCompletionMultiplier,
        antimatterRateChains,
        prestigeRateChains,
        transcendRateChains,
        acceleratorEffect: () => accelerator.effect.value,
        multiplierEffect: () => multiplier.effect.value,
        registerTick: ctx.onTick,
        coin,
        baseRequirementFor: challengeBaseRequirement,
        completionLimit: challengeCompletionLimit,
      });
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const prestige = tiers.find((t) => t.id === 'prestige');
      if (!prestige?.shards) {
        throw new Error('scaler/transcend: prestige tier (or its shards) missing from registry');
      }
      const prestigeShards = prestige.shards;

      // Module-scoped reset. resetModules covers all three tier scopes
      // (vanilla canonical: Reset.ts:482-508 — transcension cascades through
      // antimatter + prestige). The keep set exempts:
      //   - transcendPoints (gain the conversion just wrote) + its
      //     `cumulative` tracker for amount-ladder achievements
      //   - transcendCount + its tracker (cumulative-gte achievement Gate
      //     reads across transcensions)
      //   - per-challenge `completions` refs. Canonical Synergism only zeroes
      //     `challengecompletions[1..5]` at the Reincarnation reset
      //     (Reset.ts:577-594, inside `input === 'reincarnation' || ...`),
      //     never at plain transcension. Slim drops the Reincarnation tier
      //     per § 5 substrate divergences, so completions persist across
      //     all slim resets — the stacking arc spans transcend cycles, with
      //     `category.allMaxed` driving demo arc-closure once every
      //     challenge hits `completionLimit`.
      // Capability gate: "transcend produces a non-zero gain right now."
      // Slim-port equivalent of Synergism's `transcendShards.gte('1e300')`
      // (Synergism.ts:4840) — both express "the floor where the conversion
      // formula first returns ≥ 1." Slim's `floor(log_{transcendConversionLog}
      // (prestigeShards + 1))` returns ≥ 1 at `prestigeShards ==
      // transcendConversionLog` (10 per data.balance). The 1e300 canonical
      // value is correct under Synergism's own log base; lifting it 1:1 to
      // slim would make the gate unreachable.
      //
      // Reads through prestigeShards' intrinsic `cumulative` slot —
      // prestigeShards sits in the prestige scope which transcendReset walks
      // (and prestigeReset also walks), so cumulative tracks "shards earned
      // this prestige cycle" and resets at each prestige. Crystal-upgrade
      // spending can dip prestigeShards.value below threshold mid-cycle;
      // cumulative is monotonic-within-cycle.
      const canResetGate: Gate = {
        kind: 'cumulative-gte',
        resource: 'scaler/prestige-shards',
        value: data.balance.transcendConversionLog,
      };

      const transcendReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige', 'scaler/transcend'],
        canReset: canResetGate,
        keep: [
          transcendPoints,
          transcendPoints.cumulative!,
          transcendCount,
          transcendCount.cumulative!,
          ...challenges.getAll().map((e) => e.challenge.completions),
        ],
      });

      // vanilla canonical: SynergismOfficial/src/Calculate.ts:2460 —
      //   transcendPointGain = floor(log_{10}(prestigeShards + 1))
      const formula = createLogFormula(data.balance.transcendConversionLog);
      const conversion: Conversion = createConversion({
        inputs: {
          prestigeShards: createCostRequirement({
            resource: prestigeShards,
            cost: () => prestigeShards.value,
            pay: () => {
              prestigeShards.value = bn(0);
            },
          }),
        },
        outputs: {
          transcendPoints: {
            resource: transcendPoints,
            amount: ({ prestigeShards }) => formula(prestigeShards),
          },
        },
        afterConvert: () => {
          // Increment count BEFORE reset.reset() — see prestige.ts for the
          // loadingSave-watcher-suppression rationale. The keep: above
          // protects both refs from cleanup.
          addResource(transcendCount, 1);
          transcendReset.reset();
        },
      });

      const transcendTier: ScalerTier = {
        id: 'transcend',
        currency: transcendPoints,
        shards: transcendShards,
        producers,
        upgrades: upgrades as ScalerTier['upgrades'],
        conversion,
        reset: transcendReset,
        challenges,
      };
      tiers.push(transcendTier);
    },
  };
}

// Look up a Resource by id from the engine's ResourceRegistry. Throws if
// missing — cross-tier resource deps are required, not optional.
function findResourceById(
  entries: readonly { resource: { id?: string }; context: string | undefined }[],
  id: string,
): Resource<DecimalSource> {
  const found = entries.find((e) => e.resource.id === id);
  if (!found) throw new Error(`scaler/transcend: resource '${id}' not in ResourceRegistry`);
  return found.resource as Resource<DecimalSource>;
}

// Look up a category by its content-registry name (= category id passed at
// construction time). The category interface doesn't expose `id` publicly,
// but `registry.name` carries the same string. Throws if missing — cross-
// tier category deps are required.
function findCategoryById<C extends { registry: { name: string } }>(
  categories: C[],
  id: string,
): C {
  const found = categories.find((c) => c.registry.name === id);
  if (!found) throw new Error(`scaler/transcend: category '${id}' not in CategoriesKey`);
  return found;
}

interface BuildTranscendUpgradesOptions {
  transcendPoints: Resource<DecimalSource>;
  prestigePoints: Resource<DecimalSource>;
  antimatterRateChains: ModifierChain[];
  transcendRateChains: ModifierChain[];
  accBoostPerLevelMult: ComputedRef<DecimalSource>;
  transcendDefaultPerLevelMult: ComputedRef<DecimalSource>;
  upgradeCostScaling: ComputedRef<DecimalSource>;
}

// All 5 transcend-tier upgrades (acc-boost + 4 mythos upgrades) in one
// PurchasableCategory. Per-def `costCurrency` selects between the two cost
// resources; def.id === 'acc-boost' redirects the chain.bind from transcend
// rate chains to antimatter rate chains, matching Synergism's layered cost
// source (Reset.ts:498-499, Buy.ts:705).
//
// Geometric cost (def.baseCost · 10^level) via Formula.exponential — same
// internal shape as createScalingPurchasable (purchasable.ts:672-728),
// authored inline because mapPurchasable returns options rather than a
// constructed Purchasable. The chain.bind loop runs in mapState because
// the multiplier reads `purchasable.effect.value`, only available
// post-construction.
function buildTranscendUpgrades(
  opts: BuildTranscendUpgradesOptions,
): PurchasableCategory<TranscendUpgradeDef> {
  const {
    transcendPoints,
    prestigePoints,
    antimatterRateChains,
    transcendRateChains,
    accBoostPerLevelMult,
    transcendDefaultPerLevelMult,
    upgradeCostScaling,
  } = opts;
  const mirrors = new Map<string, Persistent<DecimalSource>>();

  return createPurchasableCategory<TranscendUpgradeDef>({
    id: 'scaler/transcend/upgrades',
    mapPurchasable: (def) => {
      const amount = persistent<DecimalSource>(0, { name: 'amountMirror' });
      mirrors.set(def.id, amount);

      // Formula.exponential reads its scaling param eagerly at construction;
      // wrapping in a ComputedRef would break the formula tree. The cost
      // formula carries the current default; solver-time bisection of
      // upgradeCostScaling reaches the rate via the per-level mult tunable
      // path (Formula.exponential's scaling is a constant after build).
      const cost = Formula.exponential(amount, def.baseCost, unref(upgradeCostScaling));
      const costResource = def.costCurrency === 'prestigePoints' ? prestigePoints : transcendPoints;
      const perLevelMultRef =
        def.id === 'acc-boost' ? accBoostPerLevelMult : transcendDefaultPerLevelMult;

      return {
        display: { title: def.name, description: def.description },
        requirements: createCostRequirement({ resource: costResource, cost }),
        effect: (a: DecimalSource) => Decimal.pow(unref(perLevelMultRef), a),
      };
    },
    mapState: (def, purchasable) => {
      const amount = mirrors.get(def.id);
      if (!amount) throw new Error(`scaler/transcend: missing amount mirror for ${def.id}`);

      watch(
        () => purchasable.amount.value,
        (v) => {
          amount.value = v;
        },
        { immediate: true, flush: 'sync' },
      );

      // acc-boost lifts antimatter rate chains (cross-tier flavour); regular
      // transcend upgrades lift transcend rate chains.
      const chains = def.id === 'acc-boost' ? antimatterRateChains : transcendRateChains;
      for (const chain of chains) {
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

interface BuildChallengesOptions {
  defs: ScalerChallengeDef[];
  rewardCoefficient: ComputedRef<DecimalSource>;
  antimatterRateChains: ModifierChain[];
  prestigeRateChains: ModifierChain[];
  transcendRateChains: ModifierChain[];
  acceleratorEffect: () => DecimalSource;
  multiplierEffect: () => DecimalSource;
  registerTick: (callback: (dt: number) => void) => () => void;
  coin: Resource<DecimalSource>;
  baseRequirementFor: (def: ScalerChallengeDef) => ComputedRef<DecimalSource>;
  completionLimit: ComputedRef<DecimalSource>;
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
//
// Auto-completion: `goal` closure reads `coin.value` against the canonical
// softcap-shaped threshold (Synergism.ts:3496-3500 +
// Challenges.ts:457-459). registerTick: ctx.onTick drives the engine's
// per-tick `canComplete → complete()` dispatch
// (challenge-category.ts:556-562).
function buildChallenges(opts: BuildChallengesOptions): ChallengeCategory<EngineChallengeDef> {
  const {
    defs,
    rewardCoefficient,
    antimatterRateChains,
    prestigeRateChains,
    transcendRateChains,
    acceleratorEffect,
    multiplierEffect,
    registerTick,
    coin,
    baseRequirementFor,
    completionLimit,
  } = opts;

  const category = createChallengeCategory<EngineChallengeDef>({
    id: 'scaler/transcend/challenges',
    mutuallyExclusive: true,
    registerTick,
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

    const baseRequirement = baseRequirementFor(def);
    // vanilla canonical: SynergismOfficial/src/Synergism.ts:3496-3500 +
    // Challenges.ts:457-459 — `coinsThisTranscension >= 10^(base × (1+c)²)`.
    // Slim's `coin` resource plays the role of `coinsThisTranscension` (it's
    // reset on transcend by the cascade, so its scope matches).
    const goal = (): boolean => {
      const completions = category.getChallenge(def.id)?.completions.value ?? 0;
      const exponent = Decimal.mul(unref(baseRequirement), Decimal.pow(1 + completions, 2));
      const threshold = Decimal.pow(10, exponent);
      return Decimal.gte(coin.value, threshold);
    };

    category.register({
      id: def.id,
      name: def.name,
      restricts,
      rewards,
      goal,
      completionLimit: bn(unref(completionLimit)).toNumber(),
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
  rewardCoefficient: ComputedRef<DecimalSource>;
  completions: () => number;
}

// Slim-port rewards. Each completion adds `rewardCoefficient` to a
// multiplier on the per-challenge target chain. Synergism's per-challenge
// reward formula varies (Challenges.ts:210-235 per case), so the slim
// port assigns each challenge a thematic target chain and stacks linearly.
function rewardsFor(def: ScalerChallengeDef, ctx: RewardsContext): Grant[] {
  const linearStack = (chain: ModifierChain | ModifierChain[], description: string): Grant => ({
    chain,
    mult: () => Decimal.add(1, Decimal.mul(ctx.completions(), unref(ctx.rewardCoefficient))),
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

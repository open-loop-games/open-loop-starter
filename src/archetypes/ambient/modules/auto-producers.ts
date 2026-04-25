import { computed, type ComputedRef, type Ref } from 'vue';
import {
  createOverrideRegistry,
  createProducerCategory,
  createResource,
  createTimeSystem,
  trackTotal,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type OverrideRegistry,
  type ProducerCategory,
  type Resource,
  type TimeSystem,
} from 'open-loop-engine';
import type { AmbientData, AutoProducerDef } from '../data/types';

/**
 * Override-registry value type — matches `tunable()`'s generic constraint.
 * The canonical key list is the `AmbientTunableKey` union; push-scope sites
 * are typed via `Partial<Record<AmbientTunableKey, () => DecimalSource>>`
 * so typos surface at the call site.
 */
export type AmbientTunableKey =
  | 'balance/tier1BaseRate'
  | 'balance/producerCostGrowth'
  | 'balance/achievementMultiplier'
  | 'producers/planter/purchase/baseCost'
  | 'producers/coop/purchase/baseCost';

export type AmbientTunables = Record<string, () => DecimalSource>;

// Injection keys consumed by sibling modules, composables, sim tests.

export const PrimaryResourceKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'ambient/primary-resource',
) as InjectionKey<Resource<DecimalSource>>;

export const PrimaryLifetimeKey: InjectionKey<Ref<DecimalSource>> = Symbol(
  'ambient/primary-lifetime',
) as InjectionKey<Ref<DecimalSource>>;

export const AutoProducersKey: InjectionKey<ProducerCategory<AutoProducerDef>> = Symbol(
  'ambient/auto-producers',
) as InjectionKey<ProducerCategory<AutoProducerDef>>;

export const HeadlineRateKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'ambient/headline-rate',
) as InjectionKey<ComputedRef<DecimalSource>>;

/** Ordered rateChains across all continuous producers — grant target for
 *  effects that modify every production stream at once (achievement
 *  multipliers, prestige bonuses). */
export const AllRateChainsKey: InjectionKey<ModifierChain[]> = Symbol(
  'ambient/all-rate-chains',
) as InjectionKey<ModifierChain[]>;

export const AmbientDataKey: InjectionKey<AmbientData> = Symbol(
  'ambient/data',
) as InjectionKey<AmbientData>;

export const AmbientTuningRegistryKey: InjectionKey<OverrideRegistry<AmbientTunables>> = Symbol(
  'ambient/tuning-registry',
) as InjectionKey<OverrideRegistry<AmbientTunables>>;

/** Engine TimeSystem — `elapsed` is sim-seconds since last reset,
 *  `totalPlayTime` is sim-seconds across all resets. `arc.ts` composes
 *  session-clock state on top; achievements module reads via predicates. */
export const TimeSystemKey: InjectionKey<TimeSystem> = Symbol(
  'ambient/time-system',
) as InjectionKey<TimeSystem>;

// Producers whose baseCost is registered with the tuning registry. Other
// producers pass their baseCost through unchanged — opt-in keeps the
// solver's bisection surface narrow. Mirrors producer's pattern (cursor +
// grandma); ambient bisects against planter + coop minimum.
const TUNABLE_BASE_COST_IDS = new Set<string>(['planter', 'coop']);

// The engine's Persistent<T> and trackTotal() return types use a Vue Ref
// brand from their own vue install; the starter's Vue declares a separate
// brand. Both are structurally identical `{ value: T }` reactive refs at
// runtime, so we cross the boundary once via structural casts.
type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

export function createAutoProducersModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/auto-producers',
    install(ctx) {
      const tuningRegistry = createOverrideRegistry<AmbientTunables>('ambient-tuning');

      // Register the solver-bisected balance knobs. Reader-site plumbing
      // (achievements multiplier grant, planter rateChain modifier) is
      // wired by sibling modules — the registration here exists so
      // `pushScope` from balance scripts can perturb defaults that
      // sibling modules consume via `.value`.
      tunable(tuningRegistry, 'balance/tier1BaseRate', () => data.balance.tier1BaseRate);
      tunable(tuningRegistry, 'balance/producerCostGrowth', () => data.balance.producerCostGrowth);
      tunable(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      const primaryResource = createResource<DecimalSource>(0, {
        displayName: 'Sprouts',
        precision: 0,
        id: 'sprouts',
      });
      const primaryLifetime = trackTotal(primaryResource);

      // TimeSystem provides persistent `elapsed` + `totalPlayTime`. Wired
      // into the loop here so `tick(dt)` advances both fields. Sibling
      // modules (arc.ts) compose session-clock predicates on top.
      const time = createTimeSystem();
      ctx.onTick((dt) => time.tick(dt));

      const buildings = createProducerCategory<AutoProducerDef>({
        id: 'ambient/auto-producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: primaryResource,
          baseRate: def.baseRate,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            costResource: primaryResource,
            baseCost: wrapBaseCost(tuningRegistry, def),
            costScaling: def.purchase.costScaling,
            initialAmount: def.purchase.initialAmount,
          },
        }),
      });
      buildings.register(data.producers);

      const headlineRate = computed(() => buildings.getTotalRate(primaryResource));

      const allChains: ModifierChain[] = [];
      for (const def of data.producers) {
        const producer = buildings.getProducer(def.id);
        if (producer) allChains.push(producer.rateChain);
      }

      ctx.provide(PrimaryResourceKey, primaryResource);
      ctx.provide(PrimaryLifetimeKey, asRef(primaryLifetime));
      ctx.provide(AutoProducersKey, buildings);
      ctx.provide(HeadlineRateKey, headlineRate);
      ctx.provide(AllRateChainsKey, allChains);
      ctx.provide(AmbientDataKey, data);
      ctx.provide(AmbientTuningRegistryKey, tuningRegistry);
      ctx.provide(TimeSystemKey, time);
    },
  };
}

/**
 * Wrap a producer's static baseCost behind a tunable key so scope-push can
 * retune it without mutating data. The tunable's default closure reads
 * `def.purchase.baseCost`, so unscoped runs behave identically to the
 * pre-tunable direct path.
 */
function wrapBaseCost(
  registry: OverrideRegistry<AmbientTunables>,
  def: AutoProducerDef,
): DecimalSource | ReturnType<typeof tunable<DecimalSource>> {
  if (!TUNABLE_BASE_COST_IDS.has(def.id)) return def.purchase.baseCost;
  const key = `producers/${def.id}/purchase/baseCost`;
  return tunable(registry, key, () => def.purchase.baseCost);
}

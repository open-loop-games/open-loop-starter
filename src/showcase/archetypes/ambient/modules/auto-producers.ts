import type { Ref } from 'vue';
import {
  createMultiplicativeModifier,
  createTuningRegistry,
  createProducerCategory,
  createResource,
  createTimeSystem,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ProducerCategory,
  type Resource,
  type TimeSystem,
  type TuningRegistry,
} from '@open-loop/engine';
import type { AmbientData, AutoProducerDef } from '../data/types';

/**
 * Override-registry value type — matches `tunable()`'s generic constraint.
 * The canonical key list is the `AmbientTunableKey` union; push-scope sites
 * are typed via `Partial<Record<AmbientTunableKey, () => DecimalSource>>`
 * so typos surface at the call site.
 *
 * `balance/producerCostGrowth` is intentionally absent: `ProducerMapping.
 * purchase.costScaling` is read once at producer registration, so a key here
 * would never be re-read. See `data/producers.ts` `COST_SCALING` for the
 * inline rationale and what to compose instead.
 */
export type AmbientTunableKey =
  | 'balance/tier1BaseRate'
  | 'balance/achievementMultiplier'
  | 'producers/planter/purchase/baseCost'
  | 'producers/coop/purchase/baseCost'
  | 'unlocks/coop-built/threshold'
  | 'unlocks/spring-arrives/threshold'
  | 'unlocks/year-cycles/threshold';

export type AmbientTunables = Record<string, () => DecimalSource>;

export const PrimaryLifetimeKey: InjectionKey<Ref<DecimalSource>> = Symbol(
  'ambient/primary-lifetime',
) as InjectionKey<Ref<DecimalSource>>;

export const AmbientTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'ambient/tuning-registry',
) as InjectionKey<TuningRegistry>;

// Module-scope handles set during install. Sibling modules + composables
// + UI import the typed accessors below; balance scripts that must thread
// through an `engine: Engine` parameter still use those getters since
// only one ambient engine is active per process.
let primaryResource: Resource<DecimalSource>;
let autoProducers: ProducerCategory<AutoProducerDef>;
let timeSystem: TimeSystem;

export function getPrimaryResource(): Resource<DecimalSource> {
  return primaryResource;
}

export function getAutoProducers(): ProducerCategory<AutoProducerDef> {
  return autoProducers;
}

/** Engine TimeSystem — `elapsed` is sim-seconds since last reset,
 *  `totalPlayTime` is sim-seconds across all resets. `arc.ts` composes
 *  session-clock state on top; achievements module reads via predicates. */
export function getTimeSystem(): TimeSystem {
  return timeSystem;
}

// Producers whose baseCost is registered with the tuning registry. Other
// producers pass their baseCost through unchanged — opt-in keeps the
// solver's bisection surface narrow. Mirrors producer's pattern (cursor +
// grandma); ambient bisects against planter + coop minimum.
const TUNABLE_BASE_COST_IDS = new Set<string>(['planter', 'coop']);

export function createAutoProducersModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/auto-producers',
    install(ctx) {
      const tuningRegistry = createTuningRegistry('ambient-tuning');

      // Tunables are registered at their consumer sites (where the value is
      // actually read) — `tunable()` registers on first call, no upfront
      // declaration needed. `balance/tier1BaseRate` is registered below at
      // the planter rateChain bind site; `balance/achievementMultiplier` is
      // registered by `modules/achievements.ts`.

      primaryResource = createResource<DecimalSource>(0, {
        displayName: 'Sprouts',
        precision: 0,
        id: 'sprouts',
      });
      const primaryLifetime = primaryResource.cumulative!;

      // TimeSystem provides persistent `elapsed` + `totalPlayTime`. Wired
      // into the loop here so `tick(dt)` advances both fields. The
      // session-clock module composes predicates on top.
      timeSystem = createTimeSystem();
      ctx.onTick((dt) => timeSystem.tick(dt));

      autoProducers = createProducerCategory<AutoProducerDef>({
        id: 'ambient/auto-producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: primaryResource,
          baseRate: def.baseRate,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            costResource: primaryResource,
            baseCost: TUNABLE_BASE_COST_IDS.has(def.id)
              ? tunable(
                  tuningRegistry,
                  `producers/${def.id}/purchase/baseCost`,
                  () => def.purchase.baseCost,
                )
              : def.purchase.baseCost,
            costScaling: def.purchase.costScaling,
            initialAmount: def.purchase.initialAmount,
          },
        }),
      });
      autoProducers.register(data.producers);

      // Bind tier-1 base-rate scaling to planter's rateChain. The tunable's
      // default is 1.0 (identity); scope-pushes via
      // `pushScope('balance/tier1BaseRate', ...)` retune planter's effective
      // rate without rebuilding the engine. `ProducerMapping.baseRate` is
      // static `DecimalSource` (not Computable), so scaling has to ride a
      // chain modifier — this is the only reactive path.
      const planter = autoProducers.getProducer('planter');
      if (planter) {
        const tier1BaseRate = tunable(tuningRegistry, 'balance/tier1BaseRate', () => 1.0);
        planter.rateChain.bind({
          modifier: createMultiplicativeModifier({
            multiplier: tier1BaseRate,
            description: 'Tier-1 base-rate scaling',
          }),
        });
      }

      ctx.provide(PrimaryLifetimeKey, primaryLifetime);
      ctx.provide(AmbientTuningRegistryKey, tuningRegistry);
    },
  };
}

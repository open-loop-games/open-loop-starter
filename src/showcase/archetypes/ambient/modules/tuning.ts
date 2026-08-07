import {
  createTuningRegistry,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * Keys registered against the ambient tuning registry. Solvers and balance
 * probes perturb these via `pushScope`; the engine pattern lives at
 * `open-loop-engine/src/core/override-registry.ts` and surfaces through
 * the picker (`open-loop-engine/docs/api/harness.md` § Picker).
 *
 * Namespaces:
 *   - `balance/*`                    — global balance scalars
 *   - `producers/<id>/purchase/*`    — per-producer purchase cost
 *   - `unlocks/<id>/threshold`       — per-unlock reveal threshold
 *
 * Push-scope sites are typed via
 * `Partial<Record<AmbientTunableKey, () => DecimalSource>>`, so typos surface
 * at the call site. Grep for `tunable(` to audit the surface.
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

/** Override-registry value type — matches `tunable()`'s generic constraint. */
export type AmbientTunables = Record<string, () => DecimalSource>;

export const AmbientTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'ambient/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Perturbation foundation. Creates the override registry that every
 * `tunable()` reader site in this archetype binds into.
 *
 * Runs first in the module list (no dependencies); every module holding a
 * tunable carries `dependencies: ['ambient/tuning']` and injects the registry.
 * Tunables are registered at their consumer sites, where the value is
 * actually read — `tunable()` registers on first call, so there is no upfront
 * declaration to keep in sync. The `AmbientTunableKey` union above is the
 * canonical list.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'ambient/tuning',
    install(ctx) {
      ctx.provide(AmbientTuningRegistryKey, createTuningRegistry('ambient-tuning'));
    },
  };
}

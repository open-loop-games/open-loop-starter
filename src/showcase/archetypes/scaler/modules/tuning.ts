import {
  createTuningRegistry,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * Scaler tuning surface. Picker enumerates every `tunable()` reader site
 * registered against this registry; solvers and the Balance Workbench
 * perturb via `pushScope`. Engine pattern:
 * `open-loop-engine/src/core/override-registry.ts:380` (`tunable`) and
 * `docs/api/harness.md` § Picker.
 *
 * Adoption is opt-in. Canonical-port values stay inline at the reader site
 * with citation co-located — perturbing canonical numbers is fudging, not
 * balancing (`archetypes/BALANCING.md` § Canonical numbers are not tunable).
 * Only declared-invention values (first-arc deviations from canonical, stub
 * stand-ins for unported compounding) earn a `tunable()` wrap.
 *
 * Namespace: `balance/<knob>`.
 *
 * Grep `tunable(` under `src/showcase/archetypes/scaler/` for the auditable surface.
 */
export type ScalerTunableKey =
  | 'balance/transcendDivisor'
  | 'balance/transcendThreshold'
  | 'balance/offeringBaseGain';

export type ScalerTunables = Record<string, () => DecimalSource>;

export const ScalerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'scaler/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Dedicated tuning module — runs first in the scaler module list (no
 * dependencies). Sibling modules carry `dependencies: ['scaler/tuning']`
 * and `ctx.inject(ScalerTuningRegistryKey)` to bind their `tunable()`
 * reader sites.
 *
 * Mirrors `src/archetypes/tug/modules/tuning.ts` shape. Producer's pattern
 * folds registry creation into its primary resource-defining module
 * (`producer/producers`); scaler has no single equivalent owner and reads
 * the registry from four sibling modules (transcend, runes, future
 * scaler/balance scripts), so the dedicated module keeps the boundary
 * symmetric.
 */
export const tuningModule: EngineModule = {
  id: 'scaler/tuning',
  install(ctx) {
    const registry = createTuningRegistry('scaler-tuning');
    ctx.provide(ScalerTuningRegistryKey, registry);
  },
};

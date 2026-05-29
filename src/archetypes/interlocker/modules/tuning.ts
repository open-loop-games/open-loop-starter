import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type {
  BuildingId,
  CraftId,
  InterlockerData,
  JobId,
  ResourceId,
  ScienceId,
} from '../data/types';

/**
 * Keys registered against the interlocker tuning registry. Solvers and balance
 * probes perturb these via `pushScope`; the engine pattern lives at
 * `open-loop-engine/src/core/override-registry.ts` and surfaces through the
 * picker (`open-loop-engine/docs/api/harness.md` § Picker).
 *
 * Namespaces:
 *   - `resources/<id>/baseCapacity`     — per-resource base cap before grants
 *   - `buildings/<id>/baseCost.<res>`   — multi-resource cost per building
 *   - `buildings/<id>/priceRatio`       — per-building cost scaling
 *   - `buildings/<id>/grants/<chainId>` — per-grant magnitudes
 *   - `village/jobs/<id>/baseRate`      — per-job production rate (units/sec)
 *   - `village/catnip/perKittenPerSecond`     — kitten catnip consumption
 *   - `village/kittenGrowthRatePerSec`        — base population growth rate
 *   - `smelter/woodConsumptionRate`     — wood consumed per smelter per sec
 *   - `smelter/mineralConsumptionRate`  — minerals consumed per smelter per sec
 *   - `smelter/ironProductionRate`      — iron produced per smelter per sec
 *   - `actions/gatherCatnipAmount`      — catnip per manual gather click
 *   - `actions/refineCatnipCost`        — catnip spent per manual refine
 *   - `actions/refineCatnipWoodOutput`  — wood produced per manual refine
 *   - `crafts/<id>/inputs.<res>`        — multi-input recipe magnitudes
 *   - `crafts/<id>/outputAmount`        — base output per craft fire
 *   - `sciences/<id>/baseCost`          — science research cost
 *
 * Grep for `tunable(` to audit the surface. Convergence-rule reminder
 * (`archetypes/BALANCING-defender.md § Cross-archetype convergence`): every
 * perturbable balance value is a `tunable()` site; no `data/balance.ts`
 * parallel. This is the N=3 archetype confirming the discipline.
 */
export type InterlockerTunableKey =
  // Per-resource base capacity. `science` and `kittens` are uncapped (Kittens
  // canon); their reader sites return Infinity and are not registered here.
  | `resources/${ResourceId}/baseCapacity`
  // Per-building, per-resource base cost. The string-template constraint
  // doesn't enforce that `<res>` matches the actual price-list resources;
  // modules read by composing `buildings/${id}/baseCost.${priceResource}` at
  // each tunable() reader site (one reader per price-list entry).
  | `buildings/${BuildingId}/baseCost.${ResourceId}`
  | `buildings/${BuildingId}/priceRatio`
  // Per-building grant magnitudes. The `<chainId>` segment matches the grant's
  // `chainId` field (e.g., `buildings/barn/grants/wood-max`). One tunable per
  // grant.
  | `buildings/${BuildingId}/grants/${string}`
  // Per-job production rate (units/sec). Source values are per-tick × 5.
  | `village/jobs/${JobId}/baseRate`
  | 'village/catnip/perKittenPerSecond'
  | 'village/kittenGrowthRatePerSec'
  // Smelter continuous-consumption tunables. First N=1 receipt for
  // `createContinuousConversion` (open-loop-engine/docs/candidate-primitives.md).
  | 'smelter/woodConsumptionRate'
  | 'smelter/mineralConsumptionRate'
  | 'smelter/ironProductionRate'
  // Manual opener actions (canon gather/refine, buildings.js:2747-2754).
  | 'actions/gatherCatnipAmount'
  | 'actions/refineCatnipCost'
  | 'actions/refineCatnipWoodOutput'
  // Per-craft, per-input recipe magnitudes + output amount.
  | `crafts/${CraftId}/inputs.${ResourceId}`
  | `crafts/${CraftId}/outputAmount`
  // Per-science base cost.
  | `sciences/${ScienceId}/baseCost`;

export const InterlockerDataKey: InjectionKey<InterlockerData> = Symbol(
  'interlocker/data',
) as InjectionKey<InterlockerData>;

export const InterlockerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'interlocker/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Creates the override registry that all `tunable()`
 * reader sites bind into and publishes the immutable `InterlockerData` for
 * sibling modules to pin against.
 *
 * Runs first in the module list — no dependencies. Per-module modules carry
 * `dependencies: ['interlocker/tuning']` and inject the registry.
 */
export function createTuningModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/tuning',
    install(ctx) {
      const registry = createTuningRegistry('interlocker-tuning');
      ctx.provide(InterlockerDataKey, data);
      ctx.provide(InterlockerTuningRegistryKey, registry);
    },
  };
}

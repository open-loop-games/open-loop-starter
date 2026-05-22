import type { EngineModule, InjectionKey, PurchasableCategory } from '@open-loop/engine';
import type { BuildingId, BuildingSpec, InterlockerData } from '../data/types';

/**
 * Buildings module's public API. Phase 2 worktree B fills the body — Phase 1
 * ships the type contract only.
 *
 * Single `createPurchasableCategory<BuildingSpec>` covers all 11 buildings.
 * Multi-resource `CostRequirement`s for each price-list entry; `costRatio`
 * exponentiates per `count`. Each building's `grants[]` push onto the
 * `maxChains` / `rateChains` exposed by the resources module on purchase, and
 * unbind on sell.
 *
 * Smelter is special-cased: it grants nothing but consumes wood + minerals and
 * produces iron per tick via a raw Level-3 `onTick` hand-roll. First N=1
 * receipt for `createContinuousConversion`
 * (`open-loop-engine/docs/candidate-primitives.md`).
 */
export interface BuildingsApi {
  /** The purchasable category covering all buildings — registry-walkable for
   *  UI panel + balance probes. */
  category: PurchasableCategory<BuildingSpec>;
  /** Per-building owned count. Reads through the category's per-def instance
   *  state. */
  buildingCount(id: BuildingId): number;
  /** Whether the building is currently visible to the player. Driven by
   *  `BuildingSpec.unlockedByScience` predicate against `sciences.scienceCompleted`. */
  isVisible(id: BuildingId): boolean;
}

export const BuildingsKey: InjectionKey<BuildingsApi> = Symbol(
  'interlocker/buildings',
) as InjectionKey<BuildingsApi>;

let buildings: BuildingsApi | null = null;

export function getBuildings(): BuildingsApi {
  if (!buildings) throw new Error('interlocker/buildings: not installed yet');
  return buildings;
}

/**
 * Buildings module — purchasable category + smelter onTick. Phase 1 STUB —
 * body lands in Phase 2 worktree B (OL-1058).
 *
 * Phase 2 implementation will:
 *   1. `createPurchasableCategory<BuildingSpec>` over `data.buildings`.
 *      `mapPurchasable(def)` returns:
 *        - requirements: composite `createCostRequirement` per price-list entry,
 *          each reading `tunable('buildings/<id>/baseCost.<res>')` × `costRatio^count`.
 *        - limit: Infinity (buildings are repeatable).
 *        - grants: array of `{ chain, modifier, description }` mapped from
 *          `def.grants[]`. Multi-chain grants use the `chain: ModifierChain[]`
 *          shorthand (engine emits one `chain.bind` per chain with shared
 *          activation, verified at `src/systems/category-base.ts:262-279`).
 *   2. Smelter `onTick(dt)`: read smelter count via `category.get('smelter').count`,
 *      then `subtractResource(wood, woodConsumptionRate × count × dt)` +
 *      `subtractResource(minerals, mineralConsumptionRate × count × dt)`; if
 *      both succeed (or `allowNegative: true` for soft-fail), `addResource(iron,
 *      ironProductionRate × count × dt)`. Fail-soft: skip the tick when either
 *      input is short.
 *   3. Visibility predicate per building reads `scienceCompleted(def.unlockedByScience)`
 *      via the sciences module's `SciencesApi.scienceCompleted` accessor.
 *   4. `TODO(expansion)` at the smelter onTick site → candidate
 *      `createContinuousConversion`. Three lines max.
 *
 * Reads `ResourcesKey` for the bag + per-resource handles + max/rate chains;
 * reads `SciencesKey` for the visibility predicate; reads
 * `InterlockerTuningRegistryKey` for the tunable readers.
 */
export function createBuildingsModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/buildings',
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      buildings = makeStubBuildings();
      ctx.provide(BuildingsKey, buildings);
    },
  };
}

function makeStubBuildings(): BuildingsApi {
  const notImplemented = (method: string): never => {
    throw new Error(`interlocker/buildings: ${method} not implemented in Phase 1`);
  };
  return {
    get category(): PurchasableCategory<BuildingSpec> {
      return notImplemented('category');
    },
    buildingCount: () => notImplemented('buildingCount'),
    isVisible: () => notImplemented('isVisible'),
  };
}

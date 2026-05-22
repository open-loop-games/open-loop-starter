import type { ComputedRef } from 'vue';
import {
  createAdditiveModifier,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  Decimal,
  hasResource,
  subtractResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  type PurchasableCategory,
} from '@open-loop/engine';
import type {
  BuildingGrant,
  BuildingId,
  BuildingSpec,
  InterlockerData,
  ResourceId,
} from '../data/types';
import { InterlockerTuningRegistryKey } from './tuning';
import { ResourcesKey, type ResourcesApi } from './resources';
import { SciencesKey } from './sciences';
import { VillageKey, type VillageApi } from './village';
import { WorkshopKey, type WorkshopApi } from './workshop';

/**
 * Buildings module's public API. Phase 2 worktree B fills the body — Phase 1
 * shipped the type contract only.
 *
 * Single `createPurchasableCategory<BuildingSpec>` covers all 11 buildings.
 * Multi-resource `CostRequirement`s for each price-list entry; `priceRatio`
 * exponentiates per `count`. Each building's `grants[]` push onto the
 * `maxChains` / `rateChains` exposed by the resources module on purchase, and
 * unbind on sell (via the `active` predicate composed into each binding).
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
 * Resolve a grant's `chainId` to a chain on one of the sibling module APIs.
 *
 * Three patterns map cleanly:
 *   - `<resource>-max`   → `resourcesApi.maxChains[resource]`
 *   - `<resource>-rate`  → `resourcesApi.rateChains[resource]`
 *   - `catnip-consumption-rate` → `villageApi.consumptionRateChain`
 *   - `craft-output`     → `workshopApi.craftOutputChain`
 *
 * The non-`<resource>-*` chains live on the modules that own the mechanic
 * they modify — village owns kitten catnip drain, workshop owns craft output
 * magnitude. Phase 3 wires both up through this resolver so building grants
 * with those chainIds (pasture, workshop) bind correctly.
 *
 * `villageApi` + `workshopApi` are passed as nullable so the resolver works
 * during install (when sibling modules may not have produced their API yet —
 * topo-sort guarantees they install before us per the dep declaration, but
 * defensively skipping unresolved chains keeps the binding loop tolerant).
 */
function resolveChain(
  chainId: string,
  resourcesApi: ResourcesApi,
  villageApi: VillageApi | null,
  workshopApi: WorkshopApi | null,
): ModifierChain | undefined {
  if (chainId === 'catnip-consumption-rate') {
    return villageApi?.consumptionRateChain;
  }
  if (chainId === 'craft-output') {
    return workshopApi?.craftOutputChain;
  }
  const maxMatch = /^(.+)-max$/.exec(chainId);
  if (maxMatch) {
    const id = maxMatch[1] as ResourceId;
    return resourcesApi.maxChains[id];
  }
  const rateMatch = /^(.+)-rate$/.exec(chainId);
  if (rateMatch) {
    const id = rateMatch[1] as ResourceId;
    return resourcesApi.rateChains[id];
  }
  return undefined;
}

/** Synthesize a short description for the purchasable card from a building's
 *  grant list. `data/` carries the per-grant copy as `description` strings; we
 *  join them so the tooltip surfaces every effect line. */
function describeBuilding(def: BuildingSpec): string {
  if (def.grants.length === 0) {
    // Smelter — the only building with no grants. Continuous wood + minerals
    // → iron conversion runs through the onTick hand-roll below.
    return 'Continuously converts wood + minerals into iron.';
  }
  return def.grants.map((g) => g.description).join('; ');
}

/**
 * Buildings module — purchasable category + smelter onTick. Implements
 * OL-1058 (Phase 2B).
 *
 * Per-building grants lower to `Grant` declarative bindings via
 * `setupDeclarativeBindings` inside `createPurchasableCategory`: each entry
 * activates when `purchasable.active.value === true` and deactivates on sell
 * (`amount < 1`). The grant magnitudes read through `tunable()` so the picker
 * can perturb them via `pushScope`.
 */
export function createBuildingsModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/buildings',
    // village + workshop install before buildings so the resolver can eagerly
    // pick up their `consumptionRateChain` / `craftOutputChain` for pasture
    // and workshop-building grants. Workshop's reverse-dep on buildings
    // (buildingCount in isVisible) is lazy — see workshop.ts.
    dependencies: [
      'interlocker/tuning',
      'interlocker/resources',
      'interlocker/sciences',
      'interlocker/village',
      'interlocker/workshop',
    ],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const resourcesApi = ctx.inject(ResourcesKey);
      const sciencesApi = ctx.inject(SciencesKey);
      const villageApi = ctx.inject(VillageKey);
      const workshopApi = ctx.inject(WorkshopKey);

      // ─── Tunable readers ───────────────────────────────────────────────
      // Per-building per-resource baseCost + priceRatio + per-grant magnitudes.
      // Smelter consumption/production rates live in their own namespace.
      type BuildingRefs = {
        baseCost: Map<ResourceId, ComputedRef<DecimalSource>>;
        priceRatio: ComputedRef<number>;
        grants: Map<string, ComputedRef<number>>;
      };
      const refs = new Map<BuildingId, BuildingRefs>();
      for (const def of data.buildings) {
        const baseCost = new Map<ResourceId, ComputedRef<DecimalSource>>();
        for (const price of def.prices) {
          baseCost.set(
            price.resource,
            tunable<DecimalSource>(
              registry,
              `buildings/${def.id}/baseCost.${price.resource}`,
              () => price.baseCost,
            ),
          );
        }
        const priceRatio = tunable<number>(
          registry,
          `buildings/${def.id}/priceRatio`,
          () => def.priceRatio,
        );
        const grants = new Map<string, ComputedRef<number>>();
        for (const grant of def.grants) {
          grants.set(
            grant.chainId,
            tunable<number>(
              registry,
              `buildings/${def.id}/grants/${grant.chainId}`,
              () => grant.value,
            ),
          );
        }
        refs.set(def.id, { baseCost, priceRatio, grants });
      }

      // Smelter rates live in their own namespace per the tuning module's
      // documented surface. Defaults match `SMELTER_RATES` in data/buildings.ts
      // (0.25 wood/sec, 0.25 minerals/sec, 0.1 iron/sec per smelter).
      const woodConsumptionRate = tunable<number>(
        registry,
        'smelter/woodConsumptionRate',
        () => 0.25,
      );
      const mineralConsumptionRate = tunable<number>(
        registry,
        'smelter/mineralConsumptionRate',
        () => 0.25,
      );
      const ironProductionRate = tunable<number>(registry, 'smelter/ironProductionRate', () => 0.1);

      // ─── Purchasable category ──────────────────────────────────────────
      // Explicit annotation here breaks a TS circular-inference loop — the
      // `cost` getter inside `mapPurchasable` reaches back into `category` to
      // read live counts, and `category`'s own inferred type would depend on
      // the getter's return.
      const category: PurchasableCategory<BuildingSpec> = createPurchasableCategory<BuildingSpec>({
        id: 'interlocker/buildings',
        mapPurchasable: (def) => {
          const r = refs.get(def.id)!;

          // Composite cost: one CostRequirement per price-list entry. Each
          // entry's cost reads `baseCost × priceRatio^count` — the count
          // reference resolves at requirement-evaluation time so subsequent
          // purchases re-read the up-to-date amount.
          const requirements = def.prices.map((price) => {
            const resource = resourcesApi.resources[price.resource];
            const baseCostRef = r.baseCost.get(price.resource)!;
            return createCostRequirement({
              resource,
              cost: () => {
                // Pull the live count via the per-def signals exposed by the
                // category. The category builds entries during `register()`,
                // so we look up lazily inside the getter.
                const entry = category.getEntry(def.id);
                const count = entry ? Number(entry.signals.count.value) : 0;
                return Decimal.mul(baseCostRef.value, Decimal.pow(r.priceRatio.value, count));
              },
            });
          });

          // Lower each BuildingGrant → engine Grant via the modifier escape
          // hatch (explicit `createAdditiveModifier`/`createMultiplicativeModifier`
          // per the OL-1058 contract). Unresolved chainIds (chains owned by
          // sibling modules, e.g. `craft-output` / `catnip-consumption-rate`)
          // drop their grant — those sibling modules wire their own chains.
          const grants: Grant[] = [];
          for (const grant of def.grants) {
            const chain = resolveChain(grant.chainId, resourcesApi, villageApi, workshopApi);
            if (!chain) continue;
            grants.push(buildGrant(grant, chain, r.grants.get(grant.chainId)!));
          }

          return {
            display: { title: def.name, description: describeBuilding(def) },
            requirements,
            limit: Infinity,
            grants,
            visibility: () =>
              def.unlockedByScience == null || sciencesApi.scienceCompleted(def.unlockedByScience),
          };
        },
      });
      category.register(data.buildings);

      // ─── Smelter onTick: raw Level-3 hand-roll ────────────────────────
      // TODO(expansion): wood + minerals → iron is a continuous-conversion
      // shape (see open-loop-engine/docs/candidate-primitives.md). First N=1
      // receipt; second consumer is village.ts's catnip drain.
      const wood = resourcesApi.resources.wood;
      const minerals = resourcesApi.resources.minerals;
      const iron = resourcesApi.resources.iron;

      ctx.onTick((dt) => {
        const smelter = category.getEntry('smelter');
        const count = smelter ? Number(smelter.signals.count.value) : 0;
        if (count <= 0) return;

        const woodNeed = woodConsumptionRate.value * count * dt;
        const mineralsNeed = mineralConsumptionRate.value * count * dt;
        const ironGain = ironProductionRate.value * count * dt;

        // Fail-soft: both inputs must be available before either is consumed.
        // Mirrors the canonical Kittens behaviour where the smelter stalls if
        // either reagent is exhausted.
        if (!hasResource(wood, woodNeed) || !hasResource(minerals, mineralsNeed)) return;

        subtractResource(wood, woodNeed);
        subtractResource(minerals, mineralsNeed);
        iron.value = Decimal.add(iron.value, ironGain);
      });

      // ─── API ───────────────────────────────────────────────────────────
      const api: BuildingsApi = {
        category,
        buildingCount(id) {
          const entry = category.getEntry(id);
          return entry ? Number(entry.signals.count.value) : 0;
        },
        isVisible(id) {
          const def = data.buildings.find((b) => b.id === id);
          if (!def) return false;
          return (
            def.unlockedByScience == null || sciencesApi.scienceCompleted(def.unlockedByScience)
          );
        },
      };

      buildings = api;
      ctx.provide(BuildingsKey, api);
    },
  };
}

/** Build an engine `Grant` for a single `BuildingGrant`. Reads the per-grant
 *  magnitude through the tunable ref so picker perturbations carry through. */
function buildGrant(
  grant: BuildingGrant,
  chain: ModifierChain,
  magnitude: ComputedRef<number>,
): Grant {
  if (grant.kind === 'add') {
    return {
      chain,
      description: grant.description,
      modifier: createAdditiveModifier({
        addend: () => magnitude.value,
        description: grant.description,
      }),
    };
  }
  // `kind: 'mul'` → multiplicative grant of `(1 + value)` per chain stack.
  return {
    chain,
    description: grant.description,
    modifier: createMultiplicativeModifier({
      multiplier: () => 1 + magnitude.value,
      description: grant.description,
    }),
  };
}

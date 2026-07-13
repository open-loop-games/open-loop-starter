import { computed, type ComputedRef } from 'vue';
import {
  addResource,
  createAdditiveModifier,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  Decimal,
  Formula,
  hasResource,
  persistent,
  subtractResource,
  tunable,
  withPersistentContext,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type PurchasableCategory,
} from '@open-loop/engine';
import type { BuildingId, BuildingSpec, InterlockerData, ResourceId } from '../data/types';
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
  /** Active ("on") count for a building — canon's per-building on/off throttle
   *  (buildings.js `on`). `= max(0, count − disabled)`. Continuous consumers
   *  (the smelter) run only their active count, so a player (or the automation)
   *  can pause a drain without selling. Non-continuous buildings ignore it. */
  activeCount(id: BuildingId): number;
  /** Set how many of `id` are active (on). Clamped to `[0, count]`; stored as a
   *  disabled-count so newly-built copies come online automatically (canon). */
  setActiveCount(id: BuildingId, n: number): void;
  /** Per-unit continuous smelter drain (resource/sec for ONE active smelter),
   *  for throttle math (e.g. matching active smelters to wood income). */
  readonly smelterUnitDrain: { wood: number; minerals: number };
  /** Whether the building is currently visible to the player. Driven by
   *  `BuildingSpec.unlockedByScience` predicate against `sciences.scienceCompleted`. */
  isVisible(id: BuildingId): boolean;
  /** Canon manual opener (buildings.js:2747 `gatherCatnip`): add the base
   *  per-click catnip. The bootstrap channel before any catnip field exists. */
  gatherCatnip(): void;
  /** Canon manual refine (buildings.js:2751 `refineCatnip`): spend the catnip
   *  cost to produce wood. Returns false (no-op) when catnip is short. The
   *  bootstrap channel for the first wood before any woodcutter exists. */
  refineCatnip(): boolean;
  /** Live catnip-per-gather, catnip-cost-per-refine, and wood-per-refine — the
   *  tunable opener amounts, surfaced so the action bar can label and gate the
   *  buttons without duplicating the constants. */
  readonly gatherCatnipAmount: number;
  readonly refineCatnipCost: number;
  readonly refineCatnipWoodOutput: number;
  /** Effective smelter drain (resource/sec) across all owned smelters, for wood
   *  and minerals. Zero when no smelter is owned OR the smelter is currently
   *  stalled (mirrors the onTick fail-soft: both reagents must be available
   *  before either drains). Single source of truth for "how much wood/minerals
   *  are being burned right now" — the UI's net-rate readout reads this instead
   *  of re-deriving `rate × count` and silently dropping the stall case. */
  smelterConsumptionRate: { wood: ComputedRef<number>; minerals: ComputedRef<number> };
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

      // ─── Active-count throttle (canon `on`) ─────────────────────────────
      // Per-building disabled count: `active = max(0, count − disabled)`. Stored
      // as disabled (not on) so newly-built copies come online automatically,
      // matching canon. Only continuous consumers (smelter) read it in onTick;
      // the field is general so the UI can expose it uniformly.
      const state = withPersistentContext('interlocker/buildings', () => ({
        disabled: persistent<Partial<Record<BuildingId, number>>>({}, { name: 'disabled' }),
      }));
      const buildingCountOf = (id: BuildingId): number => {
        const entry = category.getEntry(id);
        return entry ? Number(entry.signals.count.value) : 0;
      };
      const activeCountOf = (id: BuildingId): number =>
        Math.max(0, buildingCountOf(id) - (state.disabled.value[id] ?? 0));

      // Manual opener actions (canon buildings.js:2747-2754). Gather adds one
      // catnip per click; refine spends catnip to produce wood (1 + craftRatio;
      // arc-1 has no craftRatio sources yet, so base 1 wood per 100 catnip).
      const gatherCatnipAmount = tunable<number>(registry, 'actions/gatherCatnipAmount', () => 1);
      const refineCatnipCost = tunable<number>(registry, 'actions/refineCatnipCost', () => 100);
      const refineCatnipWoodOutput = tunable<number>(
        registry,
        'actions/refineCatnipWoodOutput',
        () => 1,
      );

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
          // entry's cost is `baseCost × priceRatio^count`, built as a
          // `Formula.exponential` (not a plain getter) so the engine's own
          // `getCost(amount)`/`requirementMet` compute the correct compounding
          // geometric sum for bulk purchases via closed-form integration
          // (`calculateCost`/`calculateMaxAffordable`) instead of falling back
          // to a naive `singleCost × amount` — see
          // `open-loop-engine/src/systems/purchasable.ts` `buildScalingCostRequirement`'s
          // geometric path for the same pattern. `priceRatio` is captured once
          // at construction (matching that engine convention — only `base`
          // stays reactive through tunable perturbation); `count` resolves
          // lazily via `category.getEntry` since the entry doesn't exist yet
          // inside `mapPurchasable`.
          const countRef = computed<DecimalSource>(
            () => category.getEntry(def.id)?.signals.count.value ?? 0,
          );
          const requirements = def.prices.map((price) => {
            const resource = resourcesApi.resources[price.resource];
            const baseCostRef = r.baseCost.get(price.resource)!;
            return createCostRequirement({
              resource,
              cost: Formula.exponential(countRef, baseCostRef, r.priceRatio.value),
              maxBulkAmount: Decimal.dInf,
            });
          });

          // Grants are NOT lowered here. They scale with owned count, which
          // needs the entry's live `signals.count` — but the entry/purchasable
          // doesn't exist yet inside mapPurchasable. They're bound in a
          // post-register pass below, against each registered entry's count.
          return {
            display: { title: def.name, description: describeBuilding(def) },
            requirements,
            limit: Infinity,
            visibility: () =>
              def.unlockedByScience == null || sciencesApi.scienceCompleted(def.unlockedByScience),
          };
        },
      });
      category.register(data.buildings);

      // ─── Count-scaled grant bindings (post-register) ───────────────────
      // Each building grant scales with its owned count (canon: effect × count
      // — catnipPerTickBase × fieldCount, scienceRatio × libraryCount, catnipMax
      // × barnCount). Bound here, after register, so the closure captures the
      // entry's real `signals.count` (`computed(() => amount.value)`) and the
      // purchasable's `active` ref directly — no reliance on a `category` const
      // or module-level state that the mapPurchasable-time closure can't reach
      // reliably. The grant activates with the purchasable and reads count live.
      for (const def of data.buildings) {
        const entry = category.getEntry(def.id);
        if (!entry) continue;
        const r = refs.get(def.id)!;
        const count = () => Number(entry.signals.count.value);
        for (const grant of def.grants) {
          // Production multipliers (`<resource>-rate` + kind `mul`: lumberMill,
          // mine, quarry, library) bind onto the resource's SEPARATE
          // multiplicative rate chain, not the additive one — a `mul` mixed into
          // the additive chain applies to a zero base and is silently a no-op.
          // `productionRate()` composes the two. Consumption/craft-output muls
          // apply to a non-zero base and stay on their own chains via resolveChain.
          const rateMulMatch = grant.kind === 'mul' ? /^(.+)-rate$/.exec(grant.chainId) : null;
          const rateMulResourceId = rateMulMatch?.[1] as ResourceId | undefined;
          const chain =
            rateMulResourceId && rateMulResourceId in resourcesApi.rateMulChains
              ? resourcesApi.rateMulChains[rateMulResourceId]
              : resolveChain(grant.chainId, resourcesApi, villageApi, workshopApi);
          if (!chain) continue;
          const magnitude = r.grants.get(grant.chainId)!;
          const modifier =
            grant.kind === 'add'
              ? createAdditiveModifier({
                  addend: () => magnitude.value * count(),
                  description: grant.description,
                })
              : createMultiplicativeModifier({
                  multiplier: () => 1 + magnitude.value * count(),
                  description: grant.description,
                });
          chain.bind({ active: entry.purchasable.active, modifier });
        }
      }

      // ─── Smelter onTick: raw Level-3 hand-roll ────────────────────────
      // TODO(expansion): wood + minerals → iron is a continuous-conversion
      // shape (see open-loop-engine/docs/candidate-primitives.md). First N=1
      // receipt; second consumer is village.ts's catnip drain.
      const catnip = resourcesApi.resources.catnip;
      const wood = resourcesApi.resources.wood;
      const minerals = resourcesApi.resources.minerals;
      const iron = resourcesApi.resources.iron;

      ctx.onTick((dt) => {
        // Only ACTIVE smelters consume/produce — canon's `on` throttle lets a
        // player (or the automation) pause the wood drain without selling.
        const count = activeCountOf('smelter');
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

      // Display-rate predicate for the smelter's drain. Approximates the
      // onTick fail-soft stall (both reagents must be available before either
      // drains) without needing a `dt`: once a reagent balance hits zero the
      // smelter stops drawing it, so "currently active" reduces to "both
      // balances are still positive." Good enough for a per-second readout —
      // exact dt-aligned stall timing isn't a display concern.
      const smelterActive = computed<boolean>(() => {
        const count = activeCountOf('smelter');
        return count > 0 && Decimal.gt(wood.value, 0) && Decimal.gt(minerals.value, 0);
      });
      const smelterCount = computed<number>(() => activeCountOf('smelter'));
      const smelterConsumptionRate = {
        wood: computed<number>(() =>
          smelterActive.value ? woodConsumptionRate.value * smelterCount.value : 0,
        ),
        minerals: computed<number>(() =>
          smelterActive.value ? mineralConsumptionRate.value * smelterCount.value : 0,
        ),
      };

      // ─── API ───────────────────────────────────────────────────────────
      const api: BuildingsApi = {
        category,
        buildingCount(id) {
          const entry = category.getEntry(id);
          return entry ? Number(entry.signals.count.value) : 0;
        },
        activeCount: activeCountOf,
        setActiveCount(id, n) {
          const count = buildingCountOf(id);
          const on = Math.max(0, Math.min(count, Math.floor(n)));
          state.disabled.value = { ...state.disabled.value, [id]: count - on };
        },
        get smelterUnitDrain() {
          return { wood: woodConsumptionRate.value, minerals: mineralConsumptionRate.value };
        },
        isVisible(id) {
          const def = data.buildings.find((b) => b.id === id);
          if (!def) return false;
          return (
            def.unlockedByScience == null || sciencesApi.scienceCompleted(def.unlockedByScience)
          );
        },
        gatherCatnip() {
          addResource(catnip, gatherCatnipAmount.value);
        },
        refineCatnip() {
          const cost = refineCatnipCost.value;
          if (!hasResource(catnip, cost)) return false;
          subtractResource(catnip, cost);
          addResource(wood, refineCatnipWoodOutput.value);
          return true;
        },
        get gatherCatnipAmount() {
          return gatherCatnipAmount.value;
        },
        get refineCatnipCost() {
          return refineCatnipCost.value;
        },
        get refineCatnipWoodOutput() {
          return refineCatnipWoodOutput.value;
        },
        smelterConsumptionRate,
      };

      buildings = api;
      ctx.provide(BuildingsKey, api);
    },
  };
}

import {
  Decimal,
  createModifierChain,
  createResource,
  createResourceBag,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Resource,
  type ResourceBag,
} from '@open-loop/engine';
import type { InterlockerData, ResourceId } from '../data/types';
import { InterlockerTuningRegistryKey } from './tuning';

/**
 * Resources module's public API. Phase 2 worktree A fills the body — Phase 1
 * shipped the type contract only.
 *
 * The wallet is one `createResourceBag`. Per-type capacities for the 9 capped
 * resources are sourced via getters `() => maxChains[id].apply(<baseCapacity>)`;
 * the bag polls per-read (`resource-bag.ts` `resolveCapacity`) so chain.push()
 * updates are immediately visible. `science` and `kittens` are uncapped — they
 * omit `capacityPerType` entries and the bag treats them as Infinity (per
 * `resource-bag.ts` `computeRemainingForType`: when both per-type and total
 * caps are null, the remaining-capacity computation returns dInf).
 *
 * Per-resource handles:
 *   - `resources[id]: Resource<DecimalSource>` — bag-linked Resource; consumed
 *     by Conversion/Requirement/Effect APIs identically to standalone Resources.
 *   - `maxChains[id]: ModifierChain` — buildings push grants here (barn/
 *     warehouse/hut/library/pasture per data/buildings.ts).
 *   - `rateChains[id]: ModifierChain` — village pushes job-rate modifiers;
 *     buildings push lumberMill/quarry/mine production-rate multipliers. The
 *     village module's per-tick driver reads this when computing effective
 *     production-rate-per-second for the population growth + starvation
 *     predicates.
 */
export interface ResourcesApi {
  /** The single wallet bag. Per-type cap via the getter route. */
  bag: ResourceBag;
  /** Per-resource Resource handle. Bag-linked. */
  resources: Record<ResourceId, Resource<Decimal>>;
  /** Per-resource max-cap chain. Building grants push `add`/`mul` modifiers. */
  maxChains: Record<ResourceId, ModifierChain>;
  /** Per-resource ADDITIVE production-rate chain. Job rates + additive building
   *  grants (catnip field) push here. */
  rateChains: Record<ResourceId, ModifierChain>;
  /** Per-resource MULTIPLICATIVE production-rate chain. Building production
   *  multipliers (lumberMill wood, mine/quarry minerals, library science) push
   *  here. Kept separate from `rateChains` because `ModifierChain` composes in
   *  insertion order over a zero base: a multiplier mixed into the additive
   *  chain applies to 0 (no-op). `productionRate()` composes them correctly —
   *  multipliers scale the additive sum. */
  rateMulChains: Record<ResourceId, ModifierChain>;
  /** Effective production rate/sec for a resource: the additive sum scaled by
   *  the multiplicative chain (`rateMul.apply(rate.apply(0))`). Order-independent
   *  — the canonical "sum the addends, then apply the multipliers" semantics.
   *  Excludes consumption and seasonal swing (those are caller concerns). */
  productionRate(id: ResourceId): number;
  /** AND-check across a multi-resource requirement set. Delegates to
   *  `bag.hasAll()` (engine-native). Used by craft inputs + building costs. */
  hasAll(requirements: Partial<Record<ResourceId, number>>): boolean;
}

export const ResourcesKey: InjectionKey<ResourcesApi> = Symbol(
  'interlocker/resources',
) as InjectionKey<ResourcesApi>;

let resources: ResourcesApi | null = null;

export function getResources(): ResourcesApi {
  if (!resources) throw new Error('interlocker/resources: not installed yet');
  return resources;
}

/**
 * Resources module — bag + per-type Resource + max/rate chains.
 *
 * Bag-adoption pattern: one `createResourceBag` for the wallet, with each
 * capped resource's per-type capacity sourced through a reactive getter that
 * routes through its `maxChains[id]` modifier chain (base `spec.baseCapacity`
 * passed through the chain's composed `apply`). Buildings push additive +
 * multiplicative grants onto these chains in their own install — the bag sees
 * the new effective cap on the next read because `CapacitySource` polls
 * per-call (engine `core/resource-bag.ts` `resolveCapacity`).
 *
 * Persistence: `createResource(...)` inside `install()` participates in the
 * `interlocker/resources` persistent context that the engine wraps install in
 * (engine `engine.ts` — the `withPersistentContext(mod.id, ...)` call around
 * `mod.install`). `bag.link(id, resource)` establishes two-way sync between the
 * bag slot and the persistent Resource ref, so on save→load the Resource
 * hydrates first and the bag re-syncs via its watcher — no explicit
 * `bag.serialize` / `bag.deserialize` calls needed. This is the same pattern
 * `createInventory` uses (engine `systems/inventory.ts`).
 *
 * Reads `InterlockerTuningRegistryKey` for the `resources/<id>/baseCapacity`
 * tunables — base caps are zero per Kittens canon, but the tunable surface
 * exists for balance probes that perturb starting room.
 */
export function createResourcesModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/resources',
    dependencies: ['interlocker/tuning'],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);

      // ─── Per-resource ModifierChains ──────────────────────────────────
      // One max + one rate chain per resource id, including the uncapped
      // science + kittens — the rate chains carry job-rate + building-mul
      // modifiers regardless of cap status (science is fed by scholar jobs +
      // library mul grants; kittens has no rate chain consumer in arc-1 but
      // keeping it typed-uniform avoids special-cases at every reader site).
      const maxChains = {} as Record<ResourceId, ModifierChain>;
      const rateChains = {} as Record<ResourceId, ModifierChain>;
      const rateMulChains = {} as Record<ResourceId, ModifierChain>;
      const baseCaps = new Map<ResourceId, ReturnType<typeof tunable<DecimalSource>>>();

      for (const spec of data.resources) {
        maxChains[spec.id] = createModifierChain(`max-${spec.id}`);
        rateChains[spec.id] = createModifierChain(`rate-${spec.id}`);
        rateMulChains[spec.id] = createModifierChain(`rate-mul-${spec.id}`);

        // Tunable reader for base capacity. Capped resources expose the
        // `resources/<id>/baseCapacity` key (default closure reads
        // `spec.baseCapacity`); science is uncapped (baseCapacity === null) and
        // never registers a tunable — its bag entry omits capacityPerType and
        // the bag returns Infinity room. Kittens is capped at base 0 with hut
        // grants supplying the housing room (canon `maxKittens`).
        if (spec.baseCapacity !== null) {
          baseCaps.set(
            spec.id,
            tunable<DecimalSource>(
              registry,
              `resources/${spec.id}/baseCapacity`,
              () => spec.baseCapacity as DecimalSource,
            ),
          );
        }
      }

      // ─── Bag ──────────────────────────────────────────────────────────
      // TODO(expansion): First archetype consumer of `createResourceBag` with
      // per-type reactive caps via ModifierChain getters. N=1 receipt entry:
      // candidate-primitives.md (bag-adoption pattern).
      const capacityPerType: Record<string, () => DecimalSource> = {};
      for (const spec of data.resources) {
        if (spec.baseCapacity === null) continue;
        const base = baseCaps.get(spec.id)!;
        const chain = maxChains[spec.id];
        // Polled per-read by the bag — chain.push() shows up next call. Stockpiles
        // follow canon `addRes` (`maxValue || MAX_VALUE`): a zero/empty max means
        // uncapped until a storage building grants a finite cap — so refined goods
        // (base 0) are unbounded until a warehouse. `hardCap` resources (kittens
        // population) keep the literal value: zero housing means zero room.
        capacityPerType[spec.id] = spec.hardCap
          ? () => chain.apply(base.value) as DecimalSource
          : () => {
              const cap = chain.apply(base.value);
              return (Decimal.lte(cap, 0) ? Decimal.dInf : cap) as DecimalSource;
            };
      }

      const bag = createResourceBag({
        capacityPerType,
        overflow: 'destroy',
        displayName: 'interlocker-wallet',
      });

      // ─── Per-resource Resource + link ─────────────────────────────────
      // createResource() inside install() participates in the
      // 'interlocker/resources' persistent context; bag.link does two-way
      // reactive sync. On save→load the Resource hydrates first, the linked
      // bag slot picks up the value through its resource→bag watcher.
      const resourceMap = {} as Record<ResourceId, Resource<Decimal>>;
      for (const spec of data.resources) {
        const r = createResource<DecimalSource>(Decimal.dZero, {
          id: spec.id,
          displayName: spec.name,
        }) as Resource<Decimal>;
        bag.link(spec.id, r as Resource<DecimalSource>);
        resourceMap[spec.id] = r;
      }

      // ─── API ──────────────────────────────────────────────────────────
      const api: ResourcesApi = {
        bag,
        resources: resourceMap,
        maxChains,
        rateChains,
        rateMulChains,
        productionRate(id: ResourceId): number {
          return Number(rateMulChains[id].apply(rateChains[id].apply(0)));
        },
        hasAll(requirements: Partial<Record<ResourceId, number>>): boolean {
          // Bag's hasAll signature is Record<string, DecimalSource>; the
          // ResourceId-typed Partial is structurally compatible (string keys,
          // number values are DecimalSource). Cast through to satisfy the
          // wider signature without per-key conversion.
          return bag.hasAll(requirements as Record<string, DecimalSource>);
        },
      };

      resources = api;
      ctx.provide(ResourcesKey, api);
    },
  };
}

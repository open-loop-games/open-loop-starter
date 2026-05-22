import type {
  Decimal,
  EngineModule,
  InjectionKey,
  ModifierChain,
  Resource,
  ResourceBag,
} from '@open-loop/engine';
import type { InterlockerData, ResourceId } from '../data/types';

/**
 * Resources module's public API. Phase 2 worktree A fills the body — Phase 1
 * ships the type contract only.
 *
 * The wallet is one `createResourceBag`. Per-type capacities for the 9 capped
 * resources are sourced via getters `() => maxChains[id].apply(0)`; the
 * bag polls per-read (`src/core/resource-bag.ts:43-46`) so chain.push() updates
 * are immediately visible. `science` and `kittens` are uncapped.
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
  /** Per-resource production-rate chain. Job modifiers + building multipliers. */
  rateChains: Record<ResourceId, ModifierChain>;
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
 * Resources module — bag + per-type Resource + max/rate chains. Phase 1 STUB —
 * body lands in Phase 2 worktree A (OL-1057).
 *
 * Phase 2 implementation will:
 *   1. `createResourceBag({ capacityPerType: { ... getters reading maxChains } })`
 *      with per-resource Resource + `bag.link(id, resource)`.
 *   2. `createModifierChain('max-<id>')` and `createModifierChain('rate-<id>')`
 *      per resource, exposed on the API for buildings + village to push grants.
 *   3. `withPersistentContext('interlocker/resources', () => ({ bag-state }))`
 *      so bag amounts persist across save/load. Save handler calls
 *      `bag.serialize()`; load handler calls `bag.deserialize(snapshot)`.
 *   4. `TODO(expansion)`: first archetype consumer of `createResourceBag` —
 *      drop a comment pointing at `open-loop-engine/docs/candidate-primitives.md`
 *      as N=1 receipt for the bag-adoption pattern.
 *
 * End-to-end vertical sketch (TYPE-LEVEL ONLY, gated behind `if (false)`):
 * proves the contracts compose. The sketch reads:
 *
 *   const bag = createResourceBag({ ... });
 *   const wood = createResource(0, { name: 'wood' });
 *   bag.link('wood', wood);
 *   const woodMax = createModifierChain('max-wood');
 *   // building grant pushed elsewhere:
 *   //   chain.bind({ chain: woodMax, modifier: createAdditiveModifier(200) });
 *   // craft input via Conversion (workshop module):
 *   //   createConversion({
 *   //     inputs: { wood: createCostRequirement({ resource: wood, amount: 175 }) },
 *   //     outputs: { beam: { resource: beam, gain: 1 } },
 *   //   })
 *   // hasAll multi-input precondition:
 *   //   bag.hasAll({ wood: 175, minerals: 250 })
 *
 * Phase 2A removes the sketch when authoring the real body.
 */
export function createResourcesModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/resources',
    dependencies: ['interlocker/tuning'],
    install(ctx) {
      resources = makeStubResources();
      ctx.provide(ResourcesKey, resources);
    },
  };
}

function makeStubResources(): ResourcesApi {
  const notImplemented = (method: string): never => {
    throw new Error(`interlocker/resources: ${method} not implemented in Phase 1`);
  };
  return {
    get bag(): ResourceBag {
      return notImplemented('bag');
    },
    get resources(): Record<ResourceId, Resource<Decimal>> {
      return notImplemented('resources');
    },
    get maxChains(): Record<ResourceId, ModifierChain> {
      return notImplemented('maxChains');
    },
    get rateChains(): Record<ResourceId, ModifierChain> {
      return notImplemented('rateChains');
    },
    hasAll: () => notImplemented('hasAll'),
  };
}

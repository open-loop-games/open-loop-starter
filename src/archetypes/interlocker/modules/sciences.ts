import type { EngineModule, InjectionKey, PurchasableCategory } from '@open-loop/engine';
import type { InterlockerData, ScienceCompletedEvent, ScienceId, ScienceSpec } from '../data/types';

/**
 * Sciences module's public API. Phase 3 (single-Opus integration pass) fills
 * the body — Phase 1 ships the type contract only.
 *
 * `createPurchasableCategory<ScienceSpec>` with `limit: 1` per def — once
 * researched, never re-purchasable. Cost requirement is a single
 * `createCostRequirement({ resource: science })` reading
 * `tunable('sciences/<id>/baseCost')`.
 *
 * Visibility cascade — `scienceCompleted(predecessor)` predicate flips the
 * `isVisible` gate on each downstream science. The same predicate drives
 * building visibility (buildings module) AND craft visibility (workshop
 * module), so this module's `scienceCompleted` is the cross-cutting access
 * point for the uniform predicate shape.
 */
export interface SciencesApi {
  /** The purchasable category covering all sciences. */
  category: PurchasableCategory<ScienceSpec>;
  /** Whether the named science has been researched. The uniform predicate
   *  shape consumed by buildings + crafts visibility AND science-prereq
   *  visibility. */
  scienceCompleted(id: ScienceId): boolean;
  /** Whether a science is currently visible to the player (prerequisite met,
   *  not yet researched). */
  isVisible(id: ScienceId): boolean;
  /** Subscribe to per-science completion events. UI uses for unlock-cascade
   *  toast aggregation. */
  onScienceCompleted(handler: (event: ScienceCompletedEvent) => void): () => void;
}

export const SciencesKey: InjectionKey<SciencesApi> = Symbol(
  'interlocker/sciences',
) as InjectionKey<SciencesApi>;

let sciences: SciencesApi | null = null;

export function getSciences(): SciencesApi {
  if (!sciences) throw new Error('interlocker/sciences: not installed yet');
  return sciences;
}

/**
 * Sciences module — limit:1 purchasable category + completion-flipped
 * visibility cascade. Phase 1 STUB — body lands in Phase 3 (integration pass).
 *
 * Phase 3 implementation will:
 *   1. `createPurchasableCategory<ScienceSpec>({ limit: 1, ... })` over
 *      `data.sciences`. `mapPurchasable(def)` returns:
 *        - requirements: `createCostRequirement({ resource: science,
 *            amount: tunable('sciences/<id>/baseCost') })`.
 *        - visibleWhen: `() => def.prerequisite == null || scienceCompleted(def.prerequisite)`.
 *   2. `scienceCompleted(id)`: read through the category's per-def
 *      `purchased > 0` state.
 *   3. Buildings + workshop modules read `scienceCompleted` via the
 *      `SciencesKey` injection to drive their own visibility predicates.
 */
export function createSciencesModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/sciences',
    dependencies: ['interlocker/tuning', 'interlocker/resources'],
    install(ctx) {
      sciences = makeStubSciences();
      ctx.provide(SciencesKey, sciences);
    },
  };
}

function makeStubSciences(): SciencesApi {
  const notImplemented = (method: string): never => {
    throw new Error(`interlocker/sciences: ${method} not implemented in Phase 1`);
  };
  return {
    get category(): PurchasableCategory<ScienceSpec> {
      return notImplemented('category');
    },
    scienceCompleted: () => notImplemented('scienceCompleted'),
    isVisible: () => notImplemented('isVisible'),
    onScienceCompleted: () => notImplemented('onScienceCompleted'),
  };
}

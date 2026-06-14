import {
  createCostRequirement,
  createEmitHandle,
  createPurchasableCategory,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
} from '@open-loop/engine';
import type { InterlockerData, ScienceCompletedEvent, ScienceId, ScienceSpec } from '../data/types';
import { InterlockerTuningRegistryKey } from './tuning';
import { ResourcesKey } from './resources';

/**
 * Sciences module's public API.
 *
 * `createPurchasableCategory<ScienceSpec>` with `limit: 1` per def — once
 * researched, never re-purchasable. Cost requirement is a single
 * `createCostRequirement({ resource: science })` reading
 * `tunable('sciences/<id>/baseCost')`.
 *
 * Visibility cascade — `scienceCompleted(predecessor)` predicate flips the
 * `visibleWhen` gate on each downstream science. The same predicate drives
 * building visibility (buildings module) AND craft visibility (workshop
 * module), so this module's `scienceCompleted` is the cross-cutting access
 * point for the uniform predicate shape locked by the umbrella's contract.
 */
export interface SciencesApi {
  /** The purchasable category covering all sciences. */
  category: PurchasableCategory<ScienceSpec>;
  /** Whether the named science has been researched. The uniform predicate
   *  shape consumed by buildings + crafts visibility AND science-prereq
   *  visibility. Reads through the category's per-def `signals.unlocked` flag
   *  (limit:1 means purchased == unlocked == completed). */
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

interface SciencesEvents {
  'science-completed': (event: ScienceCompletedEvent) => void;
}

/**
 * Sciences module — limit:1 purchasable category + completion-flipped
 * visibility cascade. Implements OL-1056 Phase 3 sciences body.
 *
 * Each science is a one-shot `Purchasable` whose `requirements` are a single
 * `createCostRequirement` against the `science` Resource. The cost reader
 * routes through `tunable('sciences/<id>/baseCost')` so balance probes can
 * perturb individual research costs via `pushScope`.
 *
 * Completion-flipped visibility: `visibility` on each purchasable resolves to
 * `def.prerequisite == null || scienceCompleted(def.prerequisite)`. The
 * `scienceCompleted(id)` predicate reads through `purchasable.active.value`
 * (latch on `amount >= 1`). Because `limit: 1`, `active === true` is
 * equivalent to "researched"; the same predicate is the public API.
 *
 * The 0→1 transition fires `science-completed` via the engine's emit handle
 * pattern. Subscription happens at register-time inside `mapState`, so the
 * watch fires once per purchase regardless of how many subscribers attach.
 */
export function createSciencesModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/sciences',
    dependencies: ['interlocker/tuning', 'interlocker/resources'],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const resourcesApi = ctx.inject(ResourcesKey);
      const handle = createEmitHandle<SciencesEvents>();

      // Tunable readers for base costs. One per science, defaulting to the
      // ScienceSpec's `baseCost` field.
      const baseCostById = new Map<ScienceId, ReturnType<typeof tunable<DecimalSource>>>();
      for (const def of data.sciences) {
        baseCostById.set(
          def.id,
          tunable<DecimalSource>(registry, `sciences/${def.id}/baseCost`, () => def.baseCost),
        );
      }

      // Forward-declare the api binding so `mapPurchasable` can close over
      // `scienceCompleted` for the visibility predicate. The function reads
      // through `category.getEntry(id)` once the category is constructed, so
      // the closure captures the binding after the createPurchasableCategory
      // call returns.
      let categoryRef: PurchasableCategory<ScienceSpec> | null = null;
      function scienceCompleted(id: ScienceId): boolean {
        const entry = categoryRef?.getEntry(id);
        return entry ? entry.purchasable.active.value : false;
      }

      const category = createPurchasableCategory<ScienceSpec>({
        id: 'interlocker/sciences',
        mapPurchasable: (def) => {
          const costRef = baseCostById.get(def.id)!;
          return {
            display: { title: def.name, description: `Research ${def.name}.` },
            requirements: createCostRequirement({
              resource: resourcesApi.resources.science,
              cost: () => costRef.value,
            }),
            limit: 1,
            visibility: () => def.prerequisite == null || scienceCompleted(def.prerequisite),
          };
        },
      });
      categoryRef = category;
      category.register(data.sciences);

      // Wire one purchase-event handler per science. `Purchasable.on('purchase')`
      // fires synchronously inside `purchase()` per the engine's emitter pattern,
      // which is the right granularity for a "research-completed" notification.
      // limit:1 means the event fires at most once per science.
      const startedAt = engineTimeAccessor(ctx);
      for (const def of data.sciences) {
        const entry = category.getEntry(def.id);
        if (!entry) continue;
        entry.purchasable.on('purchase', () => {
          handle.emit('science-completed', { scienceId: def.id, simTime: startedAt() });
        });
      }

      sciences = {
        category,
        scienceCompleted,
        isVisible(id: ScienceId): boolean {
          const def = data.sciences.find((s) => s.id === id);
          if (!def) return false;
          // Visible when prereq met AND not yet researched.
          const prereqOk = def.prerequisite == null || scienceCompleted(def.prerequisite);
          const notYet = !scienceCompleted(id);
          return prereqOk && notYet;
        },
        onScienceCompleted: (h) => handle.on('science-completed', h),
      };

      ctx.provide(SciencesKey, sciences);
    },
  };
}

/**
 * Best-effort accessor for the engine's elapsed sim time. The engine context
 * doesn't expose a public time accessor (per the EngineContext interface read
 * during Phase 1 contract authoring), so we fall back to `Date.now()` adjusted
 * relative to install time. Sim-time precision is only load-bearing for
 * harness-driven probes — Phase 5 balance can author a dedicated accessor if
 * the wall-clock approximation drifts beyond tolerance.
 */
function engineTimeAccessor(
  _ctx: Parameters<NonNullable<EngineModule['install']>>[0],
): () => number {
  const installEpoch = performance.now();
  return () => (performance.now() - installEpoch) / 1000;
}

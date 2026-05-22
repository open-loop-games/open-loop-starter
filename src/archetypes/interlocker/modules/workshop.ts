import type { CategoryBase, Conversion, EngineModule, InjectionKey } from '@open-loop/engine';
import type { CraftId, CraftSpec, CraftedEvent, InterlockerData } from '../data/types';

/**
 * Workshop module's public API. Phase 3 (single-Opus integration pass) fills
 * the body — Phase 1 ships the type contract only.
 *
 * Crafts compose `createCategoryBase<CraftSpec>` + one `createConversion` per
 * recipe, attached as instance state. The category surface gives registry-
 * walkability (UI panel + balance probes), per-def persistent context auto-
 * naming (`crafts/<id>/timesCrafted` etc.), and citation-anchored data shape.
 *
 * `triggerCraft(id)` fires the per-def conversion's `convert()` — atomic multi-
 * input deduction + multi-output add. Outputs cap-clamped by the bag's
 * `capacityPerType` getters; `convert()` returns the actual produced amount
 * (zero if any input is short).
 */
export interface WorkshopApi {
  /** Per-craft registry. Each instance carries a `conversion: Conversion` and
   *  a `timesCrafted: Persistent<number>` counter. */
  category: CategoryBase<CraftSpec, { conversion: Conversion; timesCrafted: number }>;
  /** Fire the craft once. Returns actual amounts produced (zero if inputs
   *  insufficient or output bag-cap-clamped). */
  triggerCraft(id: CraftId): Record<string, number>;
  /** Whether the craft is currently visible to the player. Driven by
   *  `CraftSpec.unlockedByScience` predicate AND workshop building being
   *  owned. */
  isVisible(id: CraftId): boolean;
  /** Subscribe to per-craft fire events. UI uses for toast aggregation. */
  onCrafted(handler: (event: CraftedEvent) => void): () => void;
}

export const WorkshopKey: InjectionKey<WorkshopApi> = Symbol(
  'interlocker/workshop',
) as InjectionKey<WorkshopApi>;

let workshop: WorkshopApi | null = null;

export function getWorkshop(): WorkshopApi {
  if (!workshop) throw new Error('interlocker/workshop: not installed yet');
  return workshop;
}

/**
 * Workshop module — crafts via `createCategoryBase` + `createConversion`. Phase
 * 1 STUB; stays a stub through Phase 2 (the worktree fan-out only covers
 * resources/buildings/village). Phase 3 fills the body.
 *
 * Phase 3 implementation will (per OL-1056 § Crafts shape (locked)):
 *   1. `createCategoryBase<CraftSpec, { conversion, timesCrafted }>` over
 *      `data.crafts`. `buildState(def)` returns:
 *        - conversion: `createConversion({
 *            inputs: <one CostRequirement per input>,
 *            outputs: { [def.outputResource]: { resource, gain: outputAmount × craftRatioMul } },
 *          })`
 *        - timesCrafted: `persistent(0)` (auto-named via the category-base
 *          per-def persistent context — engine sets the name to `timesCrafted`
 *          under the `crafts/<id>` namespace).
 *   2. `triggerCraft(id)` calls `instance.conversion.convert()`; emits
 *      `CraftedEvent` on success; bumps `timesCrafted`.
 *   3. Visibility predicate: `CraftSpec.unlockedByScience` completed AND
 *      `buildings.buildingCount('workshop') > 0`.
 */
export function createWorkshopModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/workshop',
    dependencies: [
      'interlocker/tuning',
      'interlocker/resources',
      'interlocker/buildings',
      'interlocker/sciences',
    ],
    install(ctx) {
      workshop = makeStubWorkshop();
      ctx.provide(WorkshopKey, workshop);
    },
  };
}

function makeStubWorkshop(): WorkshopApi {
  const notImplemented = (method: string): never => {
    throw new Error(`interlocker/workshop: ${method} not implemented in Phase 1`);
  };
  return {
    get category(): CategoryBase<CraftSpec, { conversion: Conversion; timesCrafted: number }> {
      return notImplemented('category');
    },
    triggerCraft: () => notImplemented('triggerCraft'),
    isVisible: () => notImplemented('isVisible'),
    onCrafted: () => notImplemented('onCrafted'),
  };
}

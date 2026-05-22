import {
  createCategoryBase,
  createConversion,
  createCostRequirement,
  createEmitHandle,
  createModifierChain,
  Decimal,
  persistent,
  tunable,
  type CategoryBase,
  type Conversion,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
} from '@open-loop/engine';
import type { CraftId, CraftInput, CraftSpec, CraftedEvent, InterlockerData } from '../data/types';
import { InterlockerTuningRegistryKey } from './tuning';
import { ResourcesKey } from './resources';
import { SciencesKey } from './sciences';
import { BuildingsKey } from './buildings';

/**
 * Workshop module's public API.
 *
 * Crafts compose `createCategoryBase<CraftSpec>` + one `createConversion` per
 * recipe, attached as the per-def `instance`. The category surface gives
 * registry-walkability (UI panel + balance probes), per-def persistent context
 * auto-naming, and citation-anchored data shape.
 *
 * `triggerCraft(id)` fires the per-def conversion's `convert()` — atomic
 * multi-input deduction + multi-output add. Output magnitudes route through
 * `craftOutputChain.apply(baseOutputAmount)` so workshop building grants
 * (per-building `craft-output` mul) compose correctly.
 */
export interface WorkshopApi {
  /** Per-craft registry. Each instance carries a `conversion` and a
   *  `timesCrafted` counter (number snapshot — backed by a persistent ref
   *  internally; reads through a getter so the contract surface stays a
   *  primitive number per the Phase 1 type lock). */
  category: CategoryBase<CraftSpec, { conversion: Conversion; timesCrafted: number }>;
  /** Output-magnitude chain. Workshop building grants (`+6% mul` per workshop)
   *  bind here; per-craft conversions apply it to their output amount. */
  craftOutputChain: ModifierChain;
  /** Fire the craft once. Returns actual amounts produced (zero if inputs
   *  insufficient — `createConversion` snapshots inputs and bails atomically
   *  when `canConvert` is false). */
  triggerCraft(id: CraftId): Record<string, DecimalSource>;
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

interface WorkshopEvents {
  crafted: (event: CraftedEvent) => void;
}

/**
 * Workshop module — crafts via `createCategoryBase` + `createConversion`.
 * Implements OL-1056 Phase 3 workshop body.
 *
 * Per-craft `createConversion`:
 *   - `inputs`: one `createCostRequirement` per `CraftInput`. Cost reader
 *     routes through `tunable('crafts/<id>/inputs.<resource>')` so balance
 *     probes can perturb recipes via `pushScope`.
 *   - `outputs`: single output keyed by craft id. The amount reader pulls
 *     `tunable('crafts/<id>/outputAmount')` and routes through
 *     `craftOutputChain.apply(base)` — workshop building grants compose mul
 *     here.
 *   - `afterConvert(_, produced)`: emits `CraftedEvent` and bumps the
 *     per-def `timesCrafted` persistent counter.
 *
 * Visibility: `CraftSpec.unlockedByScience` researched (or null) AND the
 * `workshop` building has been built at least once.
 *
 * Dependency on buildings is read-only (count check) and lazy — the workshop
 * module depends on buildings module install order, which is fine because
 * the engine topo-sorts on `dependencies`. The cross-module workshop ↔
 * buildings reference (workshop reads buildingCount; buildings resolver
 * rebinds craft-output) doesn't form a static cycle because buildings'
 * resolver looks up workshop lazily via `() => ctx.inject(WorkshopKey)`.
 */
export function createWorkshopModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/workshop',
    // Note: NOT depending on `interlocker/buildings`. Buildings' Phase 3 resolver
    // extension reads `WorkshopKey.craftOutputChain` eagerly at install, which
    // means workshop must install BEFORE buildings. The buildingCount check
    // inside `isVisible` is the only direction-reversed read — resolved lazily
    // via `() => ctx.inject(BuildingsKey)` so install order doesn't fight us.
    // Mirrors village's lazy `SciencesKey` pattern (village.ts:132-134).
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const resourcesApi = ctx.inject(ResourcesKey);
      const sciencesApi = ctx.inject(SciencesKey);
      // Resolved lazily — buildings installs after workshop so that buildings'
      // resolver can inject the workshop's craftOutputChain at its install
      // time. `isVisible` only resolves when called from UI, well after both
      // modules have installed.
      const buildingsApi = () => ctx.inject(BuildingsKey);
      const handle = createEmitHandle<WorkshopEvents>();

      // Output-amount chain. Workshop building grants ({ chainId: 'craft-output',
      // kind: 'mul', value: 0.06 }) bind here via the buildings module's
      // resolver extension (Phase 3 wiring). Multiple workshops compound the
      // mul through the chain's standard `(1 + 0.06)^count` semantics.
      const craftOutputChain = createModifierChain('craft-output');

      // Per-craft tunable readers, built lazily inside the buildState closure
      // so each one is keyed by its def at registration time.
      function buildInputCostRef(craftId: CraftId, input: CraftInput) {
        return tunable<DecimalSource>(
          registry,
          `crafts/${craftId}/inputs.${input.resource}`,
          () => input.amount,
        );
      }
      function buildOutputAmountRef(craftId: CraftId, baseAmount: number) {
        return tunable<number>(registry, `crafts/${craftId}/outputAmount`, () => baseAmount);
      }

      const category = createCategoryBase<
        CraftSpec,
        { conversion: Conversion; timesCrafted: number }
      >({
        id: 'crafts',
        buildInstance: (def) => {
          // The per-def persistent context is open here per
          // `category-base.ts:180` (`beginPersistentContext(${categoryId}/${def.id})`).
          // Explicit name keeps the save-key stable (`crafts/<id>/timesCrafted`)
          // even if buildInstance gets reordered relative to other fields.
          const timesCraftedRef = persistent<number>(0, { name: 'timesCrafted' });
          const outputAmountRef = buildOutputAmountRef(def.id, def.outputAmount);

          // Inputs: one CostRequirement per CraftInput, keyed by resource id.
          const inputs: Record<string, ReturnType<typeof createCostRequirement>> = {};
          for (const input of def.inputs) {
            const costRef = buildInputCostRef(def.id, input);
            inputs[input.resource] = createCostRequirement({
              resource: resourcesApi.resources[input.resource],
              cost: () => costRef.value,
            });
          }

          // Single output keyed by craft id. Amount = chain.apply(base × tunable).
          // Reading through Number() preserves the contract amount type even if
          // the chain returns a Decimal (`apply` accepts DecimalSource).
          const outputs = {
            [def.id]: {
              resource: resourcesApi.resources[def.outputResource],
              amount: (): DecimalSource =>
                new Decimal(craftOutputChain.apply(outputAmountRef.value)),
            },
          };

          const conversion = createConversion({
            inputs,
            outputs,
            afterConvert: (_, produced) => {
              const producedAmount = Number(produced[def.id] ?? 0);
              timesCraftedRef.value += 1;
              handle.emit('crafted', {
                craftId: def.id,
                outputResource: def.outputResource,
                outputAmount: producedAmount,
              });
            },
          });

          return {
            conversion,
            // Snapshot via getter so the contract field type (`number`) matches
            // while the underlying persistence rides through `timesCraftedRef`.
            // Consumers that need reactive reads can read `conversion` / the
            // crafted event stream instead.
            get timesCrafted(): number {
              return Number(timesCraftedRef.value);
            },
          };
        },
      });
      category.register(data.crafts);

      workshop = {
        category,
        craftOutputChain,
        triggerCraft(id: CraftId): Record<string, DecimalSource> {
          const entry = category.getEntry(id);
          if (!entry) return {};
          return entry.instance.conversion.convert();
        },
        isVisible(id: CraftId): boolean {
          const def = data.crafts.find((c) => c.id === id);
          if (!def) return false;
          const sciencePrereqOk =
            def.unlockedByScience == null || sciencesApi.scienceCompleted(def.unlockedByScience);
          const workshopBuilt = buildingsApi().buildingCount('workshop') > 0;
          return sciencePrereqOk && workshopBuilt;
        },
        onCrafted: (h) => handle.on('crafted', h),
      };

      ctx.provide(WorkshopKey, workshop);
    },
  };
}

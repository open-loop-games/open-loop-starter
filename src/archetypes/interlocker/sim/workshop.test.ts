/**
 * Workshop module sim suite (OL-1056 Phase 3).
 *
 * Workshop depends on resources + sciences (real) and reaches into buildings
 * lazily via `() => ctx.inject(BuildingsKey)` for the workshop-building
 * ownership check in `isVisible`. We provide all three sibling stand-ins so
 * the workshop body installs against contracts that exercise the real
 * createCategoryBase + createConversion + craftOutputChain wiring.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createEngine,
  createModifierChain,
  createMultiplicativeModifier,
  createResource,
  createTuningRegistry,
  Decimal,
  type Engine,
  type EngineModule,
  type ModifierChain,
  type Resource,
} from '@open-loop/engine';
import {
  BuildingsKey,
  InterlockerDataKey,
  InterlockerTuningRegistryKey,
  ResourcesKey,
  SciencesKey,
  WorkshopKey,
  type BuildingsApi,
  type ResourcesApi,
  type SciencesApi,
  type WorkshopApi,
} from '../modules';
import { createWorkshopModule } from '../modules/workshop';
import { DEFAULT_INTERLOCKER_DATA } from '../data';
import type { CraftId, ResourceId, ScienceId } from '../data/types';

const RESOURCE_IDS: ResourceId[] = [
  'catnip',
  'wood',
  'minerals',
  'iron',
  'science',
  'kittens',
  'beam',
  'slab',
  'plate',
  'scaffold',
  'megalith',
];

interface TestResourcesHandle {
  api: ResourcesApi;
  resources: Record<ResourceId, Resource<Decimal>>;
}

function createTestResourcesModule(handle: { value: TestResourcesHandle | null }): EngineModule {
  return {
    id: 'interlocker/resources',
    dependencies: ['interlocker/tuning'],
    install(ctx) {
      const resources = {} as Record<ResourceId, Resource<Decimal>>;
      const maxChains = {} as Record<ResourceId, ModifierChain>;
      const rateChains = {} as Record<ResourceId, ModifierChain>;
      const rateMulChains = {} as Record<ResourceId, ModifierChain>;
      for (const id of RESOURCE_IDS) {
        resources[id] = createResource<Decimal>(new Decimal(0), {
          displayName: id,
          id,
        }) as Resource<Decimal>;
        maxChains[id] = createModifierChain(`${id}-max`);
        rateChains[id] = createModifierChain(`${id}-rate`);
        rateMulChains[id] = createModifierChain(`${id}-rate-mul`);
      }
      const api: ResourcesApi = {
        bag: new Proxy(
          {},
          {
            get: () => {
              throw new Error('test bag not implemented');
            },
          },
        ) as never,
        resources,
        maxChains,
        rateChains,
        rateMulChains,
        productionRate: (id) => Number(rateMulChains[id].apply(rateChains[id].apply(0))),
        hasAll(reqs) {
          for (const [id, amt] of Object.entries(reqs)) {
            if (amt == null) continue;
            if (Decimal.lt(resources[id as ResourceId].value, amt)) return false;
          }
          return true;
        },
      };
      handle.value = { api, resources };
      ctx.provide(ResourcesKey, api);
    },
  };
}

function createTestSciencesModule(
  completed: { value: Set<ScienceId> } = { value: new Set() },
): EngineModule {
  const api: SciencesApi = {
    get category(): never {
      throw new Error('test sciences category not implemented');
    },
    scienceCompleted: (id: ScienceId) => completed.value.has(id),
    isVisible: () => false,
    onScienceCompleted: () => () => {},
  };
  return {
    id: 'interlocker/sciences',
    dependencies: ['interlocker/tuning', 'interlocker/resources'],
    install(ctx) {
      ctx.provide(SciencesKey, api);
    },
  };
}

/** Buildings stand-in. Reports a settable `workshop` count for the workshop
 *  module's `isVisible` predicate. No real category — we provide the minimal
 *  shape and rely on the test setting `workshopCount.value` directly. */
function createTestBuildingsModule(workshopCount: { value: number }): EngineModule {
  const api: BuildingsApi = {
    get category(): never {
      throw new Error('test buildings category not implemented');
    },
    buildingCount: (id) => (id === 'workshop' ? workshopCount.value : 0),
    isVisible: () => false,
    gatherCatnip: () => {},
    refineCatnip: () => false,
    gatherCatnipAmount: 1,
    refineCatnipCost: 100,
    refineCatnipWoodOutput: 1,
  };
  return {
    id: 'interlocker/buildings',
    // Mirror the real Phase 3 deps minus the cycle-creators — workshop
    // installs before this stand-in so the workshop-side lazy injection of
    // BuildingsKey resolves. We DON'T add village/workshop to this stub's
    // deps because the stub only provides BuildingsKey; the resolver
    // wiring only matters for the real buildings module.
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      ctx.provide(BuildingsKey, api);
    },
  };
}

function createTestTuningModule(): EngineModule {
  return {
    id: 'interlocker/tuning',
    install(ctx) {
      const registry = createTuningRegistry('interlocker-tuning-test');
      ctx.provide(InterlockerDataKey, DEFAULT_INTERLOCKER_DATA);
      ctx.provide(InterlockerTuningRegistryKey, registry);
    },
  };
}

interface Bench {
  engine: Engine;
  workshop: WorkshopApi;
  resources: Record<ResourceId, Resource<Decimal>>;
  completedSciences: { value: Set<ScienceId> };
  workshopCount: { value: number };
}

interface BootOptions {
  completedSciences?: ScienceId[];
  workshopCount?: number;
}

function bootBench(opts: BootOptions = {}): Bench {
  const handle: { value: TestResourcesHandle | null } = { value: null };
  const completedSciences = { value: new Set<ScienceId>(opts.completedSciences ?? []) };
  const workshopCount = { value: opts.workshopCount ?? 0 };
  const namespace = `interlocker-workshop-test-${Math.random().toString(36).slice(2)}`;
  const engine = createEngine({
    gameId: namespace,
    persistenceNamespace: namespace,
    persistence: false,
    mods: [
      {
        id: 'test',
        name: 'test',
        modules: [
          createTestTuningModule(),
          createTestResourcesModule(handle),
          createTestSciencesModule(completedSciences),
          createWorkshopModule(DEFAULT_INTERLOCKER_DATA),
          createTestBuildingsModule(workshopCount),
        ],
      },
    ],
  });
  engine.selectMod('test');
  engine.start();
  const workshop = engine.tryInject(WorkshopKey);
  if (!workshop) throw new Error('WorkshopApi not provided');
  if (!handle.value) throw new Error('test resources handle not populated');
  return {
    engine,
    workshop,
    resources: handle.value.resources,
    completedSciences,
    workshopCount,
  };
}

const ALL_SCIENCES: ScienceId[] = [
  'calendar',
  'agriculture',
  'mining',
  'metal',
  'construction',
  'architecture',
];

describe('interlocker/workshop — crafts via createCategoryBase + createConversion', () => {
  let bench: Bench;
  beforeEach(() => {
    bench = bootBench({ completedSciences: ALL_SCIENCES, workshopCount: 1 });
  });
  afterEach(() => {
    bench.engine.dispose();
  });

  it('registers all 6 craft defs', () => {
    expect(bench.workshop.category.size).toBe(6);
  });

  it('crafts beam: 175 wood deducted, beam +1, timesCrafted incremented', () => {
    bench.resources.wood.value = new Decimal(300);
    const beamEntry = bench.workshop.category.getEntry('beam');
    expect(beamEntry).toBeDefined();
    expect(beamEntry!.instance.timesCrafted).toBe(0);

    const produced = bench.workshop.triggerCraft('beam');
    expect(Decimal.eq(produced.beam ?? 0, 1)).toBe(true);
    expect(Decimal.eq(bench.resources.wood.value, 125)).toBe(true);
    expect(Decimal.eq(bench.resources.beam.value, 1)).toBe(true);
    expect(beamEntry!.instance.timesCrafted).toBe(1);
  });

  it('crafts megalith: multi-input (25 beam + 50 slab + 5 plate) deducts atomically', () => {
    bench.resources.beam.value = new Decimal(100);
    bench.resources.slab.value = new Decimal(100);
    bench.resources.plate.value = new Decimal(100);

    const produced = bench.workshop.triggerCraft('megalith');
    expect(Decimal.eq(produced.megalith ?? 0, 1)).toBe(true);
    expect(Decimal.eq(bench.resources.beam.value, 75)).toBe(true);
    expect(Decimal.eq(bench.resources.slab.value, 50)).toBe(true);
    expect(Decimal.eq(bench.resources.plate.value, 95)).toBe(true);
    expect(Decimal.eq(bench.resources.megalith.value, 1)).toBe(true);
  });

  it('fail-soft: trigger with empty wood produces nothing and deducts nothing', () => {
    // Wood starts at 0 — beam recipe needs 175.
    const produced = bench.workshop.triggerCraft('beam');
    expect(produced).toEqual({});
    expect(Decimal.eq(bench.resources.wood.value, 0)).toBe(true);
    expect(Decimal.eq(bench.resources.beam.value, 0)).toBe(true);
  });

  it('craft-output chain multiplies output: +10% mul → 1.1 wood per craft', () => {
    bench.resources.catnip.value = new Decimal(200);

    // Push +10% mul onto the workshop's craft-output chain. Builds module
    // grants do this in production via the chain.bind activation predicate;
    // here we push directly to verify the per-craft amount reader routes
    // through the chain.
    bench.workshop.craftOutputChain.bind({
      id: 'test/craft-output-mul',
      modifier: createMultiplicativeModifier({
        multiplier: () => 1.1,
        description: 'test +10% craft output',
      }),
    });

    const produced = bench.workshop.triggerCraft('wood');
    expect(Decimal.eq(produced.wood ?? 0, 1.1)).toBe(true);
    expect(Decimal.eq(bench.resources.wood.value, 1.1)).toBe(true);
  });

  it('isVisible: gated by both science AND workshop ownership', () => {
    bench.completedSciences.value = new Set<ScienceId>();
    bench.workshopCount.value = 0;
    // wood craft requires `mining` science + workshop building
    expect(bench.workshop.isVisible('wood')).toBe(false);

    bench.completedSciences.value = new Set<ScienceId>(['mining']);
    expect(bench.workshop.isVisible('wood')).toBe(false); // no workshop yet

    bench.workshopCount.value = 1;
    expect(bench.workshop.isVisible('wood')).toBe(true);

    // megalith requires architecture science specifically
    expect(bench.workshop.isVisible('megalith')).toBe(false);
    bench.completedSciences.value = new Set<ScienceId>(['mining', 'architecture']);
    expect(bench.workshop.isVisible('megalith')).toBe(true);
  });

  it('onCrafted fires per trigger with the produced amount', () => {
    bench.resources.wood.value = new Decimal(400);
    const events: { craft: CraftId; amount: number }[] = [];
    bench.workshop.onCrafted((event) => {
      events.push({ craft: event.craftId, amount: event.outputAmount });
    });

    bench.workshop.triggerCraft('beam');
    bench.workshop.triggerCraft('beam');

    expect(events).toEqual([
      { craft: 'beam', amount: 1 },
      { craft: 'beam', amount: 1 },
    ]);
  });
});

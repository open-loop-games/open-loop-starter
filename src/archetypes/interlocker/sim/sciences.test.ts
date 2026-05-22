/**
 * Sciences module sim suite (OL-1056 Phase 3).
 *
 * Sciences depend on resources (for the `science` Resource handle) but not on
 * village/buildings/workshop. The bench builds a tests-only resources stand-in
 * mirroring the shape used by `buildings.test.ts`, so we exercise the full
 * sciences body against real createPurchasableCategory + createCostRequirement
 * surfaces without booting the entire archetype.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createEngine,
  createModifierChain,
  createResource,
  createTuningRegistry,
  Decimal,
  type Engine,
  type EngineModule,
  type ModifierChain,
  type Resource,
} from '@open-loop/engine';
import {
  InterlockerDataKey,
  InterlockerTuningRegistryKey,
  ResourcesKey,
  SciencesKey,
  type ResourcesApi,
  type SciencesApi,
} from '../modules';
import { createSciencesModule } from '../modules/sciences';
import { DEFAULT_INTERLOCKER_DATA } from '../data';
import type { ResourceId, ScienceId } from '../data/types';

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
      for (const id of RESOURCE_IDS) {
        resources[id] = createResource<Decimal>(new Decimal(0), {
          displayName: id,
          id,
        }) as Resource<Decimal>;
        maxChains[id] = createModifierChain(`${id}-max`);
        rateChains[id] = createModifierChain(`${id}-rate`);
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
  sciences: SciencesApi;
  resources: Record<ResourceId, Resource<Decimal>>;
}

function bootBench(): Bench {
  const handle: { value: TestResourcesHandle | null } = { value: null };
  const namespace = `interlocker-sciences-test-${Math.random().toString(36).slice(2)}`;
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
          createSciencesModule(DEFAULT_INTERLOCKER_DATA),
        ],
      },
    ],
  });
  engine.selectMod('test');
  engine.start();
  const sciences = engine.tryInject(SciencesKey);
  if (!sciences) throw new Error('SciencesApi not provided');
  if (!handle.value) throw new Error('test resources handle not populated');
  return { engine, sciences, resources: handle.value.resources };
}

function getPurchasable(sciences: SciencesApi, id: ScienceId) {
  const p = sciences.category.getPurchasable(id);
  if (!p) throw new Error(`science purchasable ${id} not found`);
  return p;
}

describe('interlocker/sciences — limit:1 purchasable + visibility cascade', () => {
  let bench: Bench;
  beforeEach(() => {
    bench = bootBench();
  });
  afterEach(() => {
    bench.engine.dispose();
  });

  it('registers all 6 science defs', () => {
    expect(bench.sciences.category.size).toBe(6);
  });

  it('research calendar deducts cost and flips scienceCompleted', () => {
    // Calendar base cost: 30 science.
    bench.resources.science.value = new Decimal(30);
    expect(bench.sciences.scienceCompleted('calendar')).toBe(false);

    const calendar = getPurchasable(bench.sciences, 'calendar');
    expect(calendar.canPurchase.value).toBe(true);

    const bought = calendar.purchase(1);
    expect(Decimal.eq(bought, 1)).toBe(true);
    expect(bench.sciences.scienceCompleted('calendar')).toBe(true);
    expect(Decimal.eq(bench.resources.science.value, 0)).toBe(true);
  });

  it('refuses to research downstream science when prerequisite is incomplete', () => {
    // Agriculture requires calendar. Without calendar, agriculture's visibility
    // predicate returns false.
    bench.resources.science.value = new Decimal(100);
    expect(bench.sciences.isVisible('agriculture')).toBe(false);
  });

  it('visibility cascade: agriculture unlocks once calendar is completed', () => {
    bench.resources.science.value = new Decimal(30 + 100);
    expect(bench.sciences.isVisible('agriculture')).toBe(false);

    // Research calendar.
    getPurchasable(bench.sciences, 'calendar').purchase(1);
    expect(bench.sciences.scienceCompleted('calendar')).toBe(true);
    expect(bench.sciences.isVisible('agriculture')).toBe(true);

    // Now agriculture is researchable.
    const agriculture = getPurchasable(bench.sciences, 'agriculture');
    expect(agriculture.canPurchase.value).toBe(true);
    agriculture.purchase(1);
    expect(bench.sciences.scienceCompleted('agriculture')).toBe(true);
  });

  it('limit:1 — once researched, scienceCompleted stays true and purchasable is maxed', () => {
    bench.resources.science.value = new Decimal(60);
    const calendar = getPurchasable(bench.sciences, 'calendar');
    calendar.purchase(1);
    expect(calendar.maxed.value).toBe(true);
    expect(calendar.canPurchase.value).toBe(false);
    // Science not consumed a second time.
    expect(Decimal.eq(bench.resources.science.value, 30)).toBe(true);
  });

  it('isVisible returns false for already-researched sciences', () => {
    bench.resources.science.value = new Decimal(30);
    expect(bench.sciences.isVisible('calendar')).toBe(true);
    getPurchasable(bench.sciences, 'calendar').purchase(1);
    expect(bench.sciences.isVisible('calendar')).toBe(false);
  });

  it('onScienceCompleted fires on the 0→1 transition', () => {
    const events: ScienceId[] = [];
    bench.sciences.onScienceCompleted((event) => events.push(event.scienceId));

    bench.resources.science.value = new Decimal(30);
    getPurchasable(bench.sciences, 'calendar').purchase(1);

    expect(events).toEqual(['calendar']);
  });
});

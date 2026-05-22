/**
 * Buildings module sim suite (OL-1058).
 *
 * Phase 2B lands the buildings module against the FROZEN Phase 1 contracts.
 * The sibling resources (OL-1057) and sciences (Phase 3) modules are still
 * stubs at the time of writing; rather than waiting for OL-1057, this suite
 * hand-rolls a minimal `ResourcesApi` / `SciencesApi` stand-in inside an
 * engine boot — the contract is what's frozen, so a tests-only impl is a
 * valid stand-in for unit-level coverage. The integration sweep rides on
 * the launching session's post-merge rebase + verify pass.
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
  BuildingsKey,
  InterlockerDataKey,
  InterlockerTuningRegistryKey,
  ResourcesKey,
  SciencesKey,
  type BuildingsApi,
  type ResourcesApi,
  type SciencesApi,
} from '../modules';
import { createBuildingsModule } from '../modules/buildings';
import { DEFAULT_INTERLOCKER_DATA } from '../data';
import type { ResourceId, ScienceId } from '../data/types';

// ─── Test-only resources stand-in ─────────────────────────────────────────
// Mirrors the frozen `ResourcesApi` shape from `modules/resources.ts`. Real
// implementation lands in OL-1057; this version skips `ResourceBag` and uses
// raw per-resource Resources because the buildings module only consumes
// `resources[id]` + `maxChains[id]` + `rateChains[id]`.

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
  maxChains: Record<ResourceId, ModifierChain>;
  rateChains: Record<ResourceId, ModifierChain>;
}

function createTestResourcesModule(handle: { value: TestResourcesHandle | null }): EngineModule {
  return {
    id: 'interlocker/resources',
    dependencies: ['interlocker/tuning'],
    install(ctx) {
      // Build resources + chains inside the module's install scope so the
      // engine's persistent-context machinery sees the right namespace and
      // disposes them cleanly between engines (one bench per test).
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
          { get: () => { throw new Error('test bag not implemented'); } },
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
      handle.value = { api, resources, maxChains, rateChains };
      ctx.provide(ResourcesKey, api);
    },
  };
}

function createTestSciencesModule(
  completed: { value: Set<ScienceId> } = { value: new Set() },
): EngineModule {
  const api: SciencesApi = {
    // The category isn't consumed in these tests; throw if anything reads it.
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

// ─── Bench setup ──────────────────────────────────────────────────────────

interface Bench {
  engine: Engine;
  buildings: BuildingsApi;
  resources: Record<ResourceId, Resource<Decimal>>;
  maxChains: Record<ResourceId, ModifierChain>;
  completedSciences: { value: Set<ScienceId> };
}

interface BootOptions {
  /** Initial set of "completed" sciences for the visibility predicate. */
  completedSciences?: ScienceId[];
}

function bootBench(opts: BootOptions = {}): Bench {
  const handle: { value: TestResourcesHandle | null } = { value: null };
  const completedSciences = { value: new Set<ScienceId>(opts.completedSciences ?? []) };
  const namespace = `interlocker-buildings-test-${Math.random().toString(36).slice(2)}`;
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
          createBuildingsModule(DEFAULT_INTERLOCKER_DATA),
        ],
      },
    ],
  });
  engine.selectMod('test');
  engine.start();
  const buildings = engine.tryInject(BuildingsKey);
  if (!buildings) throw new Error('BuildingsApi not provided');
  if (!handle.value) throw new Error('test resources handle not populated');
  return {
    engine,
    buildings,
    resources: handle.value.resources,
    maxChains: handle.value.maxChains,
    completedSciences,
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

function getPurchasable(buildings: BuildingsApi, id: string) {
  const p = buildings.category.getPurchasable(id);
  if (!p) throw new Error(`purchasable ${id} not found`);
  return p;
}

// ─── Suite ────────────────────────────────────────────────────────────────

describe('interlocker/buildings — purchasable category + smelter onTick', () => {
  let bench: Bench;
  beforeEach(() => {
    bench = bootBench({ completedSciences: ALL_SCIENCES });
  });
  afterEach(() => {
    bench.engine.dispose();
  });

  it('registers all 11 building defs', () => {
    expect(bench.buildings.category.size).toBe(11);
  });

  it('multi-resource purchase deducts atomically (warehouse: 1.5 beam + 2 slab)', () => {
    // Warehouse base cost: 1.5 beam + 2 slab. Seed both above cost.
    bench.resources.beam.value = new Decimal(10);
    bench.resources.slab.value = new Decimal(10);

    const warehouse = getPurchasable(bench.buildings, 'warehouse');
    expect(warehouse.canPurchase.value).toBe(true);

    const bought = warehouse.purchase(1);
    expect(Decimal.eq(bought, 1)).toBe(true);
    expect(bench.buildings.buildingCount('warehouse')).toBe(1);

    // Both inputs consumed.
    expect(Decimal.eq(bench.resources.beam.value, 8.5)).toBe(true);
    expect(Decimal.eq(bench.resources.slab.value, 8)).toBe(true);
  });

  it('grants push to correct chains with correct activation (barn → wood-max=200; sell → 0)', () => {
    // Wood-max base 0 — barn adds 200 on activation.
    expect(Decimal.eq(bench.maxChains.wood.apply(0), 0)).toBe(true);

    bench.resources.wood.value = new Decimal(1000);
    const barn = getPurchasable(bench.buildings, 'barn');
    const bought = barn.purchase(1);
    expect(Decimal.eq(bought, 1)).toBe(true);

    expect(Decimal.eq(bench.maxChains.wood.apply(0), 200)).toBe(true);
    // Barn also pushes catnip / minerals / iron caps simultaneously.
    expect(Decimal.eq(bench.maxChains.catnip.apply(0), 5000)).toBe(true);
    expect(Decimal.eq(bench.maxChains.minerals.apply(0), 250)).toBe(true);
    expect(Decimal.eq(bench.maxChains.iron.apply(0), 50)).toBe(true);

    // "Sell" — the Purchasable doesn't expose a sell action in the engine API;
    // simulate sell by zeroing the amount. The Grant binding's `active`
    // predicate (purchasable.active) flips false at amount<1, deactivating
    // every grant binding.
    barn.amount.value = new Decimal(0);
    expect(Decimal.eq(bench.maxChains.wood.apply(0), 0)).toBe(true);
    expect(Decimal.eq(bench.maxChains.catnip.apply(0), 0)).toBe(true);
    expect(Decimal.eq(bench.maxChains.minerals.apply(0), 0)).toBe(true);
    expect(Decimal.eq(bench.maxChains.iron.apply(0), 0)).toBe(true);
  });

  it('warehouse multi-chain pattern: 1 warehouse pushes onto all 7 max-chains simultaneously', () => {
    bench.resources.beam.value = new Decimal(10);
    bench.resources.slab.value = new Decimal(10);

    const warehouse = getPurchasable(bench.buildings, 'warehouse');
    warehouse.purchase(1);

    // 3 raw-resource caps + 5 refined-good caps. Magnitudes lifted from data.
    expect(Decimal.eq(bench.maxChains.wood.apply(0), 150)).toBe(true);
    expect(Decimal.eq(bench.maxChains.minerals.apply(0), 200)).toBe(true);
    expect(Decimal.eq(bench.maxChains.iron.apply(0), 25)).toBe(true);
    expect(Decimal.eq(bench.maxChains.beam.apply(0), 50)).toBe(true);
    expect(Decimal.eq(bench.maxChains.slab.apply(0), 50)).toBe(true);
    expect(Decimal.eq(bench.maxChains.plate.apply(0), 50)).toBe(true);
    expect(Decimal.eq(bench.maxChains.scaffold.apply(0), 25)).toBe(true);
    expect(Decimal.eq(bench.maxChains.megalith.apply(0), 10)).toBe(true);
  });

  it('cost-scaling: barn cost grows by priceRatio per owned (50 → 87.5)', () => {
    bench.resources.wood.value = new Decimal(1000);
    const barn = getPurchasable(bench.buildings, 'barn');

    // Barn base 50 wood. First purchase deducts 50.
    barn.purchase(1);
    expect(Decimal.eq(bench.resources.wood.value, 950)).toBe(true);
    expect(Decimal.eq(barn.getCost(1), 87.5)).toBe(true);

    // Second purchase deducts 50 × 1.75 = 87.5. 950 - 87.5 = 862.5.
    barn.purchase(1);
    expect(Decimal.eq(bench.resources.wood.value, 862.5)).toBe(true);
  });

  it('smelter onTick: at full stock, consumes wood + minerals and produces iron at per-second rates', () => {
    // Need to buy the smelter first. Smelter base cost: 200 minerals.
    // Bypass the visibility predicate by patching the purchasable directly —
    // the test sciences module reports `scienceCompleted: false`, so smelter
    // isn't visible. Visibility doesn't gate `purchase()`; only the
    // requirements + limit gate it. Seed minerals above 200.
    bench.resources.minerals.value = new Decimal(1000);
    const smelter = getPurchasable(bench.buildings, 'smelter');
    smelter.purchase(1);
    expect(bench.buildings.buildingCount('smelter')).toBe(1);

    // Seed inputs above per-second budget so a 1-second tick can consume them
    // (the smelter purchase already spent some minerals — top up afresh).
    bench.resources.wood.value = new Decimal(10);
    bench.resources.minerals.value = new Decimal(10);
    const ironBefore = new Decimal(bench.resources.iron.value);

    // Drive one 1-second tick directly via the engine's TickDriver.
    bench.engine.tickDriver.simulateTick(1);

    // 1 smelter × 1s × 0.25 = 0.25 wood + 0.25 minerals consumed,
    // 0.1 iron produced.
    expect(Decimal.eq(bench.resources.wood.value, 9.75)).toBe(true);
    expect(Decimal.eq(bench.resources.minerals.value, 9.75)).toBe(true);
    expect(Decimal.eq(bench.resources.iron.value, Decimal.add(ironBefore, 0.1))).toBe(true);
  });

  it('smelter onTick: with wood depleted, the tick is skipped (no minerals consumed, no iron produced)', () => {
    bench.resources.minerals.value = new Decimal(1000);
    const smelter = getPurchasable(bench.buildings, 'smelter');
    smelter.purchase(1);

    // Wood empty; minerals + iron snapshot for comparison.
    bench.resources.wood.value = new Decimal(0);
    bench.resources.minerals.value = new Decimal(10);
    bench.resources.iron.value = new Decimal(0);

    bench.engine.tickDriver.simulateTick(1);

    // Wood was insufficient → fail-soft skip.
    expect(Decimal.eq(bench.resources.wood.value, 0)).toBe(true);
    expect(Decimal.eq(bench.resources.minerals.value, 10)).toBe(true);
    expect(Decimal.eq(bench.resources.iron.value, 0)).toBe(true);
  });

  it('visibility: building with unlockedByScience is hidden until that science completes', () => {
    // Dispose the all-sciences bench from beforeEach and rebuild with no
    // sciences completed so the hidden-gate path exercises.
    bench.engine.dispose();
    bench = bootBench({ completedSciences: [] });

    // Catnip field has no science gate — visible.
    expect(bench.buildings.isVisible('field')).toBe(true);
    // Pasture is gated on `agriculture` — not completed → hidden.
    expect(bench.buildings.isVisible('pasture')).toBe(false);

    // Once `agriculture` flips, pasture becomes visible.
    bench.completedSciences.value.add('agriculture');
    expect(bench.buildings.isVisible('pasture')).toBe(true);
  });
});

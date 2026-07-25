/**
 * Buildings module — found-regression locks.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock observable behavior;
 * discovery is elsewhere. This isn't balance-number locking (no
 * beat-fire-time / flow-band / signature-metric surface here) — it's the
 * `tug/sim` "structural invariant" exception: each case below documents a
 * bug that actually shipped and was found, exercised via direct API calls
 * against a hand-rolled stand-in engine rather than a full sim run. Not a
 * general unit-test suite — new cases land here only when they pin a found
 * regression, not to cover a code path during initial implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computed } from 'vue';
import {
  createAdditiveModifier,
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
  VillageKey,
  WorkshopKey,
  type BuildingsApi,
  type ResourcesApi,
  type SciencesApi,
  type VillageApi,
  type WorkshopApi,
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
  rateMulChains: Record<ResourceId, ModifierChain>;
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
      handle.value = { api, resources, maxChains, rateChains, rateMulChains };
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
    scienceCost: () => {
      throw new Error('test sciences scienceCost not implemented');
    },
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

/** Minimal village stand-in for the Phase 3 chain-resolver dep. Exposes the
 *  `consumptionRateChain` that pasture grants bind onto; everything else
 *  throws to surface unintended cross-module reads. */
function createTestVillageModule(consumptionRateChain: ModifierChain): EngineModule {
  const api: VillageApi = {
    get jobCounts(): never {
      throw new Error('test village jobCounts not implemented');
    },
    consumptionRateChain,
    // Buildings tests assert against `consumptionRateChain` directly (the
    // chain pasture binds onto); this composable-facing getter isn't
    // exercised here, so a stub computed satisfies the interface.
    catnipConsumptionRate: computed(() => 0),
    catnipNetRate: computed(() => 0),
    isJobVisible: () => false,
    jobRatePerSecond: () => {
      throw new Error('test village jobRatePerSecond not implemented');
    },
    setJobCount: () => {
      throw new Error('test village setJobCount not implemented');
    },
    onKittenDied: () => () => {},
    onJobCountChanged: () => () => {},
  };
  return {
    id: 'interlocker/village',
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      ctx.provide(VillageKey, api);
    },
  };
}

/** Minimal workshop stand-in for the Phase 3 chain-resolver dep. Exposes the
 *  `craftOutputChain` workshop building grants bind onto; everything else
 *  throws to surface unintended cross-module reads. */
function createTestWorkshopModule(craftOutputChain: ModifierChain): EngineModule {
  const api: WorkshopApi = {
    get category(): never {
      throw new Error('test workshop category not implemented');
    },
    craftOutputChain,
    triggerCraft: () => ({}),
    isVisible: () => false,
    onCrafted: () => () => {},
  };
  return {
    id: 'interlocker/workshop',
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      ctx.provide(WorkshopKey, api);
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
  resourcesApi: ResourcesApi;
  resources: Record<ResourceId, Resource<Decimal>>;
  maxChains: Record<ResourceId, ModifierChain>;
  rateChains: Record<ResourceId, ModifierChain>;
  rateMulChains: Record<ResourceId, ModifierChain>;
  completedSciences: { value: Set<ScienceId> };
  consumptionRateChain: ModifierChain;
  craftOutputChain: ModifierChain;
}

interface BootOptions {
  /** Initial set of "completed" sciences for the visibility predicate. */
  completedSciences?: ScienceId[];
}

function bootBench(opts: BootOptions = {}): Bench {
  const handle: { value: TestResourcesHandle | null } = { value: null };
  const completedSciences = { value: new Set<ScienceId>(opts.completedSciences ?? []) };
  const consumptionRateChain = createModifierChain('catnip-consumption-rate');
  const craftOutputChain = createModifierChain('craft-output');
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
          createTestVillageModule(consumptionRateChain),
          createTestWorkshopModule(craftOutputChain),
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
    resourcesApi: handle.value.api,
    resources: handle.value.resources,
    maxChains: handle.value.maxChains,
    rateChains: handle.value.rateChains,
    rateMulChains: handle.value.rateMulChains,
    completedSciences,
    consumptionRateChain,
    craftOutputChain,
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

describe('interlocker/buildings — found-regression locks', () => {
  let bench: Bench;
  beforeEach(() => {
    bench = bootBench({ completedSciences: ALL_SCIENCES });
  });
  afterEach(() => {
    bench.engine.dispose();
  });

  it('pasture binds its mul grant onto consumptionRateChain, not a phantom rate-mul chain', () => {
    // Regression: the `mul` + `-rate$`-suffix fast path in buildings.ts was
    // intercepting `catnip-consumption-rate` (matching the same regex as
    // `wood-rate`/`minerals-rate`/`science-rate`) and looking it up under
    // `rateMulChains['catnip-consumption']`, which doesn't exist — the grant
    // silently failed to bind and pasture had zero effect.
    expect(Decimal.eq(bench.consumptionRateChain.apply(1), 1)).toBe(true);

    bench.resources.catnip.value = new Decimal(1000);
    bench.resources.wood.value = new Decimal(1000);
    const pasture = getPurchasable(bench.buildings, 'pasture');
    pasture.purchase(1);

    // -0.5% catnip demand per pasture: apply(1) → 1 × (1 - 0.005) = 0.995.
    expect(Decimal.eq(bench.consumptionRateChain.apply(1), 0.995)).toBe(true);

    pasture.purchase(1);
    expect(Decimal.eq(bench.consumptionRateChain.apply(1), 0.99)).toBe(true);
  });

  it('production multiplier scales the additive rate: lumberMill → +10% wood', () => {
    // Simulate a woodcutter's additive wood rate (the village binds these onto
    // rateChains at assignment; here we push it directly).
    bench.rateChains.wood.add(
      createAdditiveModifier({ addend: 10, description: 'test-woodcutter' }),
    );
    expect(bench.resourcesApi.productionRate('wood')).toBe(10);

    // Build one lumberMill (its `mul` grant routes to the rate-MUL chain).
    bench.resources.wood.value = new Decimal(1000);
    bench.resources.minerals.value = new Decimal(1000);
    bench.resources.iron.value = new Decimal(1000);
    getPurchasable(bench.buildings, 'lumberMill').purchase(1);
    expect(bench.buildings.buildingCount('lumberMill')).toBe(1);

    // Multiplier scales the additive sum (10 × 1.1 = 11) — the bug this guards
    // against left the additive chain unmultiplied (a `mul` over a zero base is
    // a no-op). The additive chain itself stays clean; the mul lives separately.
    expect(bench.resourcesApi.productionRate('wood')).toBeCloseTo(11);
    expect(Number(bench.rateChains.wood.apply(0))).toBe(10);
    expect(Number(bench.rateMulChains.wood.apply(1))).toBeCloseTo(1.1);
  });

  it('smelter runs partial on the scarcest reagent instead of stalling', () => {
    // Regression: the onTick bailed outright unless BOTH reagents covered the
    // full request, commented as mirroring canon. Canon does the opposite —
    // `resPool.getAmtDependsOnStock` scales the active count down to what stock
    // supports and returns "the percentage to decrease the productivity", so a
    // short reagent throttles the run rather than stopping it. The stall meant
    // a colony one splinter short of the wood bill smelted nothing at all.
    bench.resources.wood.value = new Decimal(1000);
    bench.resources.minerals.value = new Decimal(1000);
    bench.resources.iron.value = new Decimal(1000);
    getPurchasable(bench.buildings, 'smelter').purchase(1);
    expect(bench.buildings.activeCount('smelter')).toBe(1);

    const { wood: woodPerSec, minerals: mineralsPerSec } = bench.buildings.smelterUnitDrain;

    // Leave minerals covering only a quarter of one second's draw; wood is
    // plentiful, so minerals is the limiter and the whole run scales to 0.25.
    bench.resources.minerals.value = new Decimal(mineralsPerSec * 0.25);
    bench.resources.wood.value = new Decimal(1000);
    const ironBefore = Number(bench.resources.iron.value);
    const woodBefore = Number(bench.resources.wood.value);

    bench.engine.tickDriver.simulateTick(1);

    // Minerals fully drained, wood drawn at the throttled rate, iron produced
    // at the same fraction — not zero, which is what the stall gave.
    expect(Number(bench.resources.minerals.value)).toBeCloseTo(0, 6);
    expect(woodBefore - Number(bench.resources.wood.value)).toBeCloseTo(woodPerSec * 0.25, 6);
    expect(Number(bench.resources.iron.value)).toBeGreaterThan(ironBefore);

    // The rate readout reports the throttled draw, not the requested one.
    expect(bench.buildings.smelterConsumptionRate.wood.value).toBeCloseTo(woodPerSec * 0.25, 6);
  });

  it('smelter stops only when a reagent is actually empty', () => {
    bench.resources.wood.value = new Decimal(1000);
    bench.resources.minerals.value = new Decimal(1000);
    bench.resources.iron.value = new Decimal(1000);
    getPurchasable(bench.buildings, 'smelter').purchase(1);

    bench.resources.minerals.value = new Decimal(0);
    const woodBefore = Number(bench.resources.wood.value);
    const ironBefore = Number(bench.resources.iron.value);

    bench.engine.tickDriver.simulateTick(1);

    expect(Number(bench.resources.wood.value)).toBe(woodBefore);
    expect(Number(bench.resources.iron.value)).toBe(ironBefore);
    expect(bench.buildings.smelterConsumptionRate.wood.value).toBe(0);
  });
});

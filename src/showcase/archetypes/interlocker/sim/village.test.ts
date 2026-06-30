/**
 * Village module — found-regression locks.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock observable behavior;
 * discovery is elsewhere. This is the `tug/sim` "structural invariant"
 * exception, not a balance-number lock and not a general unit-test suite —
 * the case below documents a bug that actually shipped (production silently
 * not resuming after `engine.load()`) and was found. New cases land here
 * only when they pin a found regression.
 *
 * Persistent context collision note: the engine's `persistent()` registers
 * refs into a process-global context keyed by id. Re-installing the village
 * module in a fresh test would collide on `'interlocker/village/woodcutter-count'`.
 * The suite installs ONCE in `beforeAll` and resets per-test state via
 * direct ref mutations + chain-rebinds. This matches the production wiring
 * (one engine, one install) and keeps the contract honest.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { computed, ref } from 'vue';
import {
  createModifierChain,
  createResource,
  createResourceBag,
  type Decimal,
  type EngineContext,
  type InjectionKey,
  type ModifierChain,
  type Resource,
  type ResourceBag,
} from '@open-loop/engine';

import { DEFAULT_INTERLOCKER_DATA } from '../data';
import type { ResourceId } from '../data/types';
import { createVillageModule } from '../modules/village';
import { createTuningModule } from '../modules/tuning';
import { ResourcesKey, type ResourcesApi } from '../modules/resources';
import { SciencesKey, type SciencesApi } from '../modules/sciences';
import { VillageKey, type VillageApi } from '../modules/village';
import { CalendarKey, type CalendarApi } from '../modules/calendar';

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

interface Harness {
  village: VillageApi;
  resources: ResourcesApi;
  /** Resets the per-test mutable state: kittens, catnip, job counts, sub-kitten
   *  progress, and rate-chain bindings. */
  reset: (initialKittens: number, kittenCapacity: number) => void;
  /** Fires every `ctx.onLoad` callback registered during install — simulates
   *  the save manager's `engine.load()` mutating persisted refs directly
   *  (bypassing `setJobCount`), without re-installing the module. */
  triggerLoad: () => void;
}

function buildHarness(): Harness {
  const provided = new Map<symbol, unknown>();
  const loadHandlers: Array<(data: unknown) => void> = [];
  const ctx: EngineContext = {
    onTick() {
      return () => {};
    },
    onSave: () => {},
    onLoad: (cb) => {
      loadHandlers.push(cb);
    },
    onReset: () => {},
    on: () => () => {},
    emit: () => {},
    provide<T>(key: InjectionKey<T>, value: T) {
      provided.set(key as unknown as symbol, value);
    },
    inject<T>(key: InjectionKey<T>): T {
      if (!provided.has(key as unknown as symbol)) {
        throw new Error(`stub-context: nothing provided for ${String(key)}`);
      }
      return provided.get(key as unknown as symbol) as T;
    },
    tryInject<T>(key: InjectionKey<T>): T | undefined {
      return provided.get(key as unknown as symbol) as T | undefined;
    },
  };

  const data = DEFAULT_INTERLOCKER_DATA;
  createTuningModule(data).install(ctx);

  // Resources stand-in. Kitten capacity is bag-driven via a ref so tests can
  // mutate it between cases.
  const kittenCap = ref(100);
  const bag: ResourceBag = createResourceBag({
    capacityPerType: { kittens: () => kittenCap.value },
  });
  const resources: Record<ResourceId, Resource<Decimal>> = {} as Record<
    ResourceId,
    Resource<Decimal>
  >;
  const maxChains: Record<ResourceId, ModifierChain> = {} as Record<ResourceId, ModifierChain>;
  const rateChains: Record<ResourceId, ModifierChain> = {} as Record<ResourceId, ModifierChain>;
  const rateMulChains: Record<ResourceId, ModifierChain> = {} as Record<ResourceId, ModifierChain>;
  for (const id of RESOURCE_IDS) {
    resources[id] = createResource(ref(0) as never, { displayName: id, id }) as Resource<Decimal>;
    maxChains[id] = createModifierChain(`stub-max-${id}-${Math.random().toString(36).slice(2)}`);
    rateChains[id] = createModifierChain(`stub-rate-${id}-${Math.random().toString(36).slice(2)}`);
    rateMulChains[id] = createModifierChain(
      `stub-rate-mul-${id}-${Math.random().toString(36).slice(2)}`,
    );
  }
  bag.link('kittens', resources.kittens);
  const resourcesApi: ResourcesApi = {
    bag,
    resources,
    maxChains,
    rateChains,
    rateMulChains,
    productionRate: (id) => Number(rateMulChains[id].apply(rateChains[id].apply(0))),
    hasAll: () => true,
  };
  ctx.provide(ResourcesKey, resourcesApi);

  const sciencesStub: SciencesApi = {
    category: undefined as never,
    scienceCompleted: () => true,
    isVisible: () => true,
    onScienceCompleted: () => () => {},
  };
  ctx.provide(SciencesKey, sciencesStub);

  // Calendar stand-in — catnipMultiplier 1 keeps these production/starvation
  // tests season-neutral (the real seasonal swing is exercised in calendar.test).
  const calendarStub: CalendarApi = {
    year: computed(() => 0),
    dayOfSeason: computed(() => 0),
    season: computed(() => data.seasons[0]),
    catnipMultiplier: computed(() => 1),
    onSeasonChanged: () => () => {},
  };
  ctx.provide(CalendarKey, calendarStub);

  createVillageModule(data).install(ctx);
  const village = ctx.inject(VillageKey);

  function reset(initialKittens: number, kittenCapacity: number): void {
    kittenCap.value = kittenCapacity;
    // Unwind all jobs back to zero — also tears down rate-chain bindings.
    for (const jobId of ['woodcutter', 'farmer', 'scholar', 'miner'] as const) {
      if (village.jobCounts[jobId].value !== 0) {
        // setJobCount validates against kittens.value; bump kittens first so
        // the unwind path doesn't fail spuriously.
        resources.kittens.value = 1000 as never;
        village.setJobCount(jobId, 0);
      }
    }
    resources.kittens.value = initialKittens as never;
    resources.catnip.value = 0 as never;
  }

  return {
    village,
    resources: resourcesApi,
    reset,
    triggerLoad: () => {
      for (const h of loadHandlers) h(undefined);
    },
  };
}

let H: Harness;
beforeAll(() => {
  H = buildHarness();
});

describe('interlocker/village — found-regression locks', () => {
  beforeEach(() => H.reset(5, 100));

  it('rebinds job rate modifiers on engine.load() — production resumes without a manual toggle', () => {
    // Simulate the save manager's load path: it writes the persisted job-count
    // ref directly (`deserializePersistents`), bypassing `setJobCount` and
    // therefore `bindJobModifier`. Before the load handler runs, the rate
    // chain still reflects whatever was bound at install (nothing, here).
    H.village.jobCounts.woodcutter.value = 2;
    expect(Number(H.resources.rateChains.wood.apply(0))).toBe(0);

    H.triggerLoad();

    // woodcutter base rate = 0.09/sec; 2 kittens = 0.18/sec — bound without
    // ever calling setJobCount.
    expect(Number(H.resources.rateChains.wood.apply(0))).toBeCloseTo(0.18, 6);
  });
});

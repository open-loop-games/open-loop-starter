/**
 * Village module unit tests — kittens + jobs + catnip consumption + starvation.
 *
 * The Phase 1 stubs for `ResourcesKey` (sibling OL-1057) and `SciencesKey`
 * (Phase 3) throw on access, so we cannot drive these tests through the
 * full `createInterlockerEngine` path. Instead we hand-roll a minimal
 * `ResourcesApi` stand-in and install the village module against a mock
 * `EngineContext`. After OL-1057 lands and the rebase merges it, an
 * integration test can ride the real engine; this suite stays as the
 * write-site contract lock for the four behaviors the leaf owns.
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
import type { JobId, KittenDiedEvent, ResourceId } from '../data/types';
import { createVillageModule } from '../modules/village';
import { createTuningModule } from '../modules/tuning';
import { ResourcesKey, type ResourcesApi } from '../modules/resources';
import { SciencesKey, type SciencesApi } from '../modules/sciences';
import { JobAssignmentError, VillageKey, type VillageApi } from '../modules/village';
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
  kittens: Resource<Decimal>;
  catnip: Resource<Decimal>;
  setKittenCapacity: (n: number) => void;
  tick: (dt: number) => void;
  /** Resets the per-test mutable state: kittens, catnip, job counts, sub-kitten
   *  progress, and rate-chain bindings. */
  reset: (initialKittens: number, kittenCapacity: number) => void;
}

function buildHarness(): Harness {
  const provided = new Map<symbol, unknown>();
  const tickHandlers: Array<(dt: number) => void> = [];
  const ctx: EngineContext = {
    onTick(cb) {
      tickHandlers.push(cb);
      return () => {
        const idx = tickHandlers.indexOf(cb);
        if (idx >= 0) tickHandlers.splice(idx, 1);
      };
    },
    onSave: () => {},
    onLoad: () => {},
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
    kittens: resources.kittens,
    catnip: resources.catnip,
    setKittenCapacity: (n) => (kittenCap.value = n),
    tick: (dt: number) => {
      for (const h of tickHandlers) h(dt);
    },
    reset,
  };
}

let H: Harness;
beforeAll(() => {
  H = buildHarness();
});

describe('interlocker/village — setJobCount validation', () => {
  beforeEach(() => H.reset(2, 100));

  it('throws JobAssignmentError when sum(allCounts) exceeds kittens.value', () => {
    H.village.setJobCount('woodcutter', 2);
    expect(() => H.village.setJobCount('farmer', 1)).toThrowError(JobAssignmentError);
  });

  it('allows assignment up to kittens.value', () => {
    H.reset(3, 100);
    H.village.setJobCount('woodcutter', 2);
    H.village.setJobCount('farmer', 1);
    expect(H.village.jobCounts.woodcutter.value).toBe(2);
    expect(H.village.jobCounts.farmer.value).toBe(1);
  });
});

describe('interlocker/village — job-modifier rebind', () => {
  beforeEach(() => H.reset(5, 100));

  it('binds an additive modifier on the resource rate chain reflecting count × baseRate', () => {
    H.village.setJobCount('woodcutter', 2);
    // woodcutter base rate = 0.09/sec; 2 kittens = 0.18/sec contribution.
    const woodRate = Number(H.resources.rateChains.wood.apply(0));
    expect(woodRate).toBeCloseTo(0.18, 6);
  });

  it('rebinds cleanly on increase (replaces, does not duplicate)', () => {
    H.village.setJobCount('woodcutter', 1);
    H.village.setJobCount('woodcutter', 3);
    const woodRate = Number(H.resources.rateChains.wood.apply(0));
    // 3 × 0.09 = 0.27. Would be 0.36 (= 0.09 + 0.27) if the rebind double-stacked.
    expect(woodRate).toBeCloseTo(0.27, 6);
  });

  it('unbinds on setJobCount(0)', () => {
    H.village.setJobCount('woodcutter', 2);
    H.village.setJobCount('woodcutter', 0);
    const woodRate = Number(H.resources.rateChains.wood.apply(0));
    expect(woodRate).toBe(0);
  });
});

describe('interlocker/village — population growth', () => {
  it('does not spawn kittens when the bag is at capacity (no huts)', () => {
    H.reset(0, 0);
    for (let i = 0; i < 100; i++) H.tick(1);
    expect(Number(H.kittens.value)).toBe(0);
  });

  it('spawns kittens when capacity is available', () => {
    H.reset(0, 10);
    // Seed catnip large enough that the starvation predicate never fires on
    // the (still zero-kitten) bag. Once kittens > 0 the consumption starts;
    // we tick only enough to cross one growth threshold (~20s @ 0.05/sec).
    H.catnip.value = 1000 as never;
    for (let i = 0; i < 25; i++) H.tick(1);
    expect(Number(H.kittens.value)).toBeGreaterThanOrEqual(1);
  });
});

describe('interlocker/village — catnip consumption', () => {
  it('subtracts ~4.25 catnip/sec per kitten', () => {
    H.reset(1, 100);
    H.catnip.value = 100 as never;
    H.tick(1);
    expect(Number(H.catnip.value)).toBeCloseTo(100 - 4.25, 5);
  });

  it('floors catnip at zero and starves a kitten when consumption outruns supply', () => {
    // Canon (village.js:343-367): consumption transiently drives the balance
    // negative, the starvation step kills a kitten and floors catnip back to
    // zero — the deficit is paid by the lost kitten, not carried as negative.
    H.reset(2, 100);
    H.catnip.value = 1 as never;
    H.tick(1); // 2 × 4.25 = 8.5/sec drains past zero
    expect(Number(H.catnip.value)).toBe(0);
    expect(Number(H.kittens.value)).toBe(1);
  });
});

describe('interlocker/village — starvation', () => {
  it('emits KittenDiedEvent and decrements kittens when catnip drains', () => {
    H.reset(1, 100);
    H.catnip.value = 1000 as never;
    H.tick(0.001); // fed baseline clears the starvation cooldown (kills at 0)
    let deathEvent: KittenDiedEvent | null = null;
    const off = H.village.onKittenDied((e) => {
      deathEvent = e;
    });
    H.catnip.value = 0 as never;
    H.tick(1);
    off();
    expect(deathEvent).not.toBeNull();
    expect(Number(H.kittens.value)).toBe(0);
  });

  it('demotes a job-assigned kitten in priority order (scholar first)', () => {
    H.reset(1, 100);
    H.catnip.value = 1000 as never;
    H.tick(0.001); // fed baseline clears the starvation cooldown (kills at 0)
    H.village.setJobCount('scholar', 1);
    let demotedJob: JobId | null = null;
    const off = H.village.onKittenDied((e) => {
      demotedJob = e.demotedFromJob;
    });
    H.catnip.value = 0 as never;
    H.tick(1);
    off();
    expect(demotedJob).toBe('scholar');
    expect(H.village.jobCounts.scholar.value).toBe(0);
  });

  it('does NOT fire starvation when catnip is positive', () => {
    H.reset(1, 100);
    let deathFired = false;
    const off = H.village.onKittenDied(() => {
      deathFired = true;
    });
    H.catnip.value = 10 as never;
    H.tick(0.1);
    off();
    expect(deathFired).toBe(false);
    expect(Number(H.kittens.value)).toBe(1);
  });
});

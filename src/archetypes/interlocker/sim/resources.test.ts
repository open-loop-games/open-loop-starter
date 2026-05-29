import { describe, expect, it } from 'vitest';
import {
  Decimal,
  addResource,
  createAdditiveModifier,
  subtractResource,
  type Engine,
  type InjectionKey,
} from '@open-loop/engine';
import { createInterlockerEngine } from '../boot';
import { ResourcesKey } from '../modules';

/**
 * Resources module — phase 2A invariant locks.
 *
 * The bag-adoption pattern (one wallet bag + per-id linked Resource handles +
 * per-id max/rate ModifierChains) is the first archetype consumer of
 * `createResourceBag`. Tests pin the reactive interactions that sibling
 * worktrees B (buildings) and C (village) depend on:
 *
 *   1. bag.link reactivity — Resource.value reflects bag.add / bag.subtract
 *      mutations bidirectionally.
 *   2. capacity getters poll per-read — chain.add() on maxChains is visible
 *      to bag.remainingCapacityForType on the next call.
 *   3. hasAll AND-semantics — multi-resource craft input checks.
 *   4. persistence roundtrip — save → load restores bag amounts via the
 *      linked Resource refs (which persist under the
 *      `interlocker/resources` context the engine wraps install in).
 */

const MOD_ID = 'kittens';

function mustInject<T>(engine: Engine, key: InjectionKey<T>): T {
  const v = engine.tryInject(key);
  if (v === undefined) throw new Error(`mustInject: key not provided (${String(key)})`);
  return v;
}

/** Boot a fresh interlocker engine for a single test. Unique `namespace`
 *  per test isolates the persistence keyspace in vitest's shared jsdom
 *  localStorage worker. */
function startInterlocker(namespace: string): Engine {
  const { engine } = createInterlockerEngine({ persistenceNamespace: namespace });
  engine.selectMod(MOD_ID);
  engine.start();
  return engine;
}

describe('interlocker/resources — bag-linked Resource sync', () => {
  it('Resource.value reflects bag mutations bidirectionally', () => {
    const engine = startInterlocker('bag-sync');
    const api = mustInject(engine, ResourcesKey);

    // Set the wood max-cap via the chain so adds aren't rejected. Default
    // baseCapacity is 0 (Kittens canon — buildings push the actual cap on
    // purchase); we mimic a barn grant by pushing +200 directly.
    api.maxChains.wood.add(createAdditiveModifier({ addend: 200, description: 'test-grant' }));

    // bag.add → Resource sees it.
    api.bag.add('wood', 50);
    expect(Decimal.eq(api.resources.wood.value, 50)).toBe(true);

    // Resource mutation via the `addResource` helper → bag sees it.
    addResource(api.resources.wood, 30);
    expect(api.bag.get('wood').toNumber()).toBe(80);

    // Subtract via Resource helper → bag tracks.
    subtractResource(api.resources.wood, 20);
    expect(api.bag.get('wood').toNumber()).toBe(60);
    expect(Decimal.eq(api.resources.wood.value, 60)).toBe(true);
  });
});

describe('interlocker/resources — reactive capacity via maxChains', () => {
  it('chain.add() shifts remainingCapacityForType on the next read', () => {
    const engine = startInterlocker('cap-reactive');
    const api = mustInject(engine, ResourcesKey);

    // Baseline: wood carries a 200 bootstrap base cap (data/resources.ts) so
    // woodcutter output accumulates before the barn grant. With no grants on
    // the max-chain, remaining capacity equals that base.
    expect(api.bag.remainingCapacityForType('wood').toNumber()).toBe(200);

    // Push a +100 additive grant — simulates a single barn (real building
    // grants land in Phase 2B; this test isolates the capacity-source
    // polling behavior the bag depends on).
    api.maxChains.wood.add(createAdditiveModifier({ addend: 100, description: 'test-barn' }));

    // resource-bag.ts:43-46 — CapacitySource is polled per-read, so the
    // remaining-capacity computation picks up the new chain output without
    // any explicit invalidate step.
    expect(api.bag.remainingCapacityForType('wood').toNumber()).toBe(300);

    // Adding another +50 grant stacks additively under the chain's composed
    // sequential apply.
    api.maxChains.wood.add(createAdditiveModifier({ addend: 50, description: 'test-warehouse' }));
    expect(api.bag.remainingCapacityForType('wood').toNumber()).toBe(350);
  });

  it('science is uncapped (Infinity room); kittens is housing-capped at base 0', () => {
    const engine = startInterlocker('uncapped');
    const api = mustInject(engine, ResourcesKey);

    // science baseCapacity: null → omitted from capacityPerType → bag returns
    // dInf for remainingCapacityForType (resource-bag.ts:217-218).
    expect(api.bag.remainingCapacityForType('science').eq(Decimal.dInf)).toBe(true);

    // kittens baseCapacity: 0 → bag-capped; with no hut grants the room is 0.
    // A +2 hut grant on the kittens-max chain opens room for two kittens.
    expect(api.bag.remainingCapacityForType('kittens').eq(0)).toBe(true);
    api.maxChains.kittens.add(createAdditiveModifier({ addend: 2, description: 'test-hut' }));
    expect(api.bag.remainingCapacityForType('kittens').toNumber()).toBe(2);
  });
});

describe('interlocker/resources — hasAll AND-check', () => {
  it('returns true only when every requirement is stocked', () => {
    const engine = startInterlocker('hasall');
    const api = mustInject(engine, ResourcesKey);

    // Grant room then stock both.
    api.maxChains.wood.add(createAdditiveModifier({ addend: 100, description: 'test' }));
    api.maxChains.minerals.add(createAdditiveModifier({ addend: 100, description: 'test' }));
    api.bag.add('wood', 10);
    api.bag.add('minerals', 5);

    expect(api.hasAll({ wood: 5, minerals: 3 })).toBe(true);
    expect(api.hasAll({ wood: 5, minerals: 10 })).toBe(false);
    expect(api.hasAll({ wood: 20, minerals: 3 })).toBe(false);
    expect(api.hasAll({ wood: 10, minerals: 5 })).toBe(true);
    expect(api.hasAll({ wood: 11, minerals: 5 })).toBe(false);
  });
});

describe('interlocker/resources — persistence roundtrip', () => {
  it('save → load restores bag amounts on a fresh engine instance', () => {
    // Engine A and B share `persistenceNamespace`, so engine B's load reads
    // engine A's save from the jsdom-localStorage adapter (default when no
    // custom adapter is passed).
    const NAMESPACE = 'roundtrip-resources';

    // ─── Engine A: stock the bag, save ──────────────────────────────────
    const engineA = startInterlocker(NAMESPACE);
    const apiA = mustInject(engineA, ResourcesKey);

    apiA.maxChains.wood.add(createAdditiveModifier({ addend: 500, description: 'test' }));
    apiA.maxChains.minerals.add(createAdditiveModifier({ addend: 500, description: 'test' }));
    apiA.bag.add('wood', 123);
    apiA.bag.add('minerals', 45);

    expect(apiA.resources.wood.value.toNumber()).toBe(123);
    expect(apiA.resources.minerals.value.toNumber()).toBe(45);

    engineA.save();
    engineA.dispose();

    // ─── Engine B: same namespace, fresh modules, load ──────────────────
    // dispose() above clears the in-memory persistent namespace so B can
    // install the same module set without ref-name collisions.
    const engineB = startInterlocker(NAMESPACE);
    const apiB = mustInject(engineB, ResourcesKey);

    // Re-push capacity grants BEFORE load. ModifierChains are NOT persistent —
    // they're rebuilt on install with zero modifiers. Phase 2B+ buildings
    // module will re-push grants from `connect()` based on the restored
    // (persistent) building counts. Until that's wired, the test stands in
    // by mimicking the post-connect chain state: caps must be wide enough at
    // load-time or the bag.link sync watcher clamps deserialized resource
    // amounts back to 0 (the chain's empty .apply(0) result).
    apiB.maxChains.wood.add(createAdditiveModifier({ addend: 500, description: 'test' }));
    apiB.maxChains.minerals.add(createAdditiveModifier({ addend: 500, description: 'test' }));

    const loadResult = engineB.load();
    expect(loadResult.success).toBe(true);

    // Resource.value is the post-deserialize raw (DecimalSource) — Decimal
    // serialization round-trips through Decimal.eq, not strict instanceOf.
    expect(Decimal.eq(apiB.resources.wood.value, 123)).toBe(true);
    expect(Decimal.eq(apiB.resources.minerals.value, 45)).toBe(true);
    // Bag round-trips through the linked-Resource path (the Resources are
    // the persistent edge; bag.link re-syncs the slot on the Resource's
    // post-load write through the resource→bag watcher).
    expect(apiB.bag.get('wood').toNumber()).toBe(123);
    expect(apiB.bag.get('minerals').toNumber()).toBe(45);
  });
});

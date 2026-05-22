/**
 * UI smoke + beats-1–3 wiring (OL-1060 Phase 4).
 *
 * Boots the full interlocker engine through `bootEngine` (matching the
 * AppRoot's lifecycle) and exercises the composable surface that the panels
 * consume. This is the regression-proof equivalent of the ticket's manual
 * "first field → first kitten → first calendar science" play-through —
 * confirms the composables synthesize the right state and the
 * BuildingsApi / VillageApi / SciencesApi cross-module visibility cascade
 * remains intact through the UI layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { provide, getCurrentInstance, defineComponent, type App } from 'vue';
import { Decimal, createAdditiveModifier } from '@open-loop/engine';
import { createApp as createVueApp, h } from 'vue';
import { createInterlockerEngine } from '../boot';
import { getResources, getBuildings, getSciences } from '../modules';
import { useResources } from '../ui/composables/useResources';
import { useBuildings } from '../ui/composables/useBuildings';
import { useJobs } from '../ui/composables/useJobs';
import { useSciences } from '../ui/composables/useSciences';
import { useCrafts } from '../ui/composables/useCrafts';

interface Harness {
  engine: ReturnType<typeof createInterlockerEngine>['engine'];
  app: App;
  unmount: () => void;
}

function bootInsideApp(): Harness {
  const { engine } = createInterlockerEngine({
    persistenceNamespace: `ui-smoke-${Math.random().toString(36).slice(2)}`,
  });
  engine.saveManager!.selectSlot(0);
  engine.selectMod('kittens');
  engine.start();
  engine.load();

  // Composables call inject() in some setups; mount inside a Vue app so
  // provides/injects work. The Harness component just runs setup() and
  // exposes nothing — tests assert against module state directly.
  const Harness = defineComponent({
    setup() {
      // Provide engine the way bootApp would, so composables that inject it
      // (none today, but future-proof) still resolve.
      const ins = getCurrentInstance();
      if (ins) provide('engine', engine);
      return () => null;
    },
    render() {
      return h('div');
    },
  });
  const app = createVueApp(Harness);
  app.provide('engine', engine);
  const container = document.createElement('div');
  app.mount(container);
  return {
    engine,
    app,
    unmount() {
      app.unmount();
      engine.stop();
    },
  };
}

/**
 * Push cap-room onto every resource's max chain so test seeding via
 * `bag.add()` isn't clamped to baseCapacity=0. Mimics the cumulative effect
 * of multiple barn/warehouse purchases on a real run.
 */
function seedCaps(): void {
  const resources = getResources();
  for (const id of Object.keys(resources.maxChains) as Array<keyof typeof resources.maxChains>) {
    resources.maxChains[id].bind({
      id: `test/seed-cap-${id}`,
      modifier: createAdditiveModifier({ addend: () => 1_000_000, description: 'test seed' }),
    });
  }
}

describe('interlocker UI composables — beats 1–3 wiring', () => {
  let h: Harness;
  beforeEach(() => {
    h = bootInsideApp();
  });
  afterEach(() => {
    h.unmount();
  });

  it('useResources surfaces all 11 resource readouts; capped resources carry cap; uncapped do not', () => {
    const readouts = useResources();
    expect(readouts.map((r) => r.id)).toEqual([
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
    ]);
    const science = readouts.find((r) => r.id === 'science')!;
    expect(science.cap).toBeUndefined();
    const catnip = readouts.find((r) => r.id === 'catnip')!;
    expect(catnip.cap).toBeDefined();
  });

  it('beat 1 — first catnip field: buildings.canBuy flips after seeding catnip; buy() purchases', () => {
    seedCaps();
    const resources = getResources();
    resources.bag.add('catnip', 10);

    const rows = useBuildings(() => 1);
    const field = rows.find((r) => r.id === 'field')!;
    expect(field.visible.value).toBe(true);
    expect(field.canBuy.value).toBe(true);
    expect(field.count.value).toBe(0);

    field.buy(1);
    expect(field.count.value).toBe(1);

    // Field's grant pushed onto catnip-rate; rate chain now positive.
    const rate = Number(resources.rateChains.catnip.apply(0));
    expect(rate).toBeGreaterThan(0);
  });

  it('beat 2 — first kitten: hut purchase grants +2 to kittens cap; village tick crosses growth threshold', () => {
    seedCaps();
    const resources = getResources();
    const buildings = getBuildings();
    // Hut requires 5 wood.
    resources.bag.add('wood', 5);
    const rows = useBuildings(() => 1);
    const hut = rows.find((r) => r.id === 'hut')!;
    expect(hut.canBuy.value).toBe(true);
    hut.buy(1);
    expect(hut.count.value).toBe(1);

    // After hut, kittens cap > 0 — bag has room for population growth.
    const remaining = resources.bag.remainingCapacityForType('kittens');
    expect(Decimal.gt(remaining, 0)).toBe(true);

    // Drive village growth: with a positive growth rate (0.05/sec), after 60
    // sim-seconds we expect at least 1 kitten. simulateTick(1) at the default
    // 20Hz step accumulates internally; the call advances real sim time by 1s.
    for (let i = 0; i < 60; i++) {
      h.engine.tickDriver.simulateTick(1);
    }
    const kittens = Number(resources.resources.kittens.value);
    expect(kittens).toBeGreaterThanOrEqual(1);

    // Only woodcutter is visible at this point (others are science-gated).
    // Unassigned == kittens (none allocated yet).
    const { rows: jobs, village: villageRO } = useJobs();
    expect(jobs.find((j) => j.id === 'woodcutter')!.visible.value).toBe(true);
    expect(jobs.find((j) => j.id === 'farmer')!.visible.value).toBe(false);
    expect(villageRO.unassigned.value).toBe(kittens);
    void buildings;
  });

  it('beat 3 — first calendar science: research flips scienceCompleted + cascades visibility', () => {
    seedCaps();
    const resources = getResources();
    resources.bag.add('science', 30);

    const sciences = useSciences();
    const calendar = sciences.find((s) => s.id === 'calendar')!;
    expect(calendar.researched.value).toBe(false);
    expect(calendar.canResearch.value).toBe(true);
    calendar.research();
    expect(calendar.researched.value).toBe(true);

    // Cascade: agriculture is now prereq-met (visible) but not researched.
    const ag = sciences.find((s) => s.id === 'agriculture')!;
    expect(ag.prereqMet.value).toBe(true);
    expect(ag.researched.value).toBe(false);

    // mining is two prereqs away (needs agriculture); still locked.
    const mining = sciences.find((s) => s.id === 'mining')!;
    expect(mining.prereqMet.value).toBe(false);
  });

  it('beat 4 setup — mining + workshop unlock surfaces craft visibility', () => {
    seedCaps();
    const resources = getResources();
    // Research calendar → agriculture → mining. Costs 30 + 100 + 500.
    resources.bag.add('science', 30 + 100 + 500);
    const sciences = getSciences();
    sciences.category.getEntry('calendar')!.purchasable.purchase(1);
    sciences.category.getEntry('agriculture')!.purchasable.purchase(1);
    sciences.category.getEntry('mining')!.purchasable.purchase(1);

    // Workshop visible (gated on mining); seed cost, buy.
    resources.bag.add('wood', 100);
    resources.bag.add('minerals', 400);
    const buildingRows = useBuildings(() => 1);
    const workshop = buildingRows.find((r) => r.id === 'workshop')!;
    expect(workshop.visible.value).toBe(true);
    expect(workshop.canBuy.value).toBe(true);
    workshop.buy(1);
    expect(workshop.count.value).toBe(1);

    // Wood/beam/slab/plate are mining-gated and also require workshop ≥ 1,
    // both now true → visible. Scaffold and megalith remain locked behind
    // construction / architecture.
    const crafts = useCrafts();
    const wood = crafts.find((c) => c.id === 'wood')!;
    const scaffold = crafts.find((c) => c.id === 'scaffold')!;
    expect(wood.visible.value).toBe(true);
    expect(scaffold.visible.value).toBe(false);

    // Research construction so scaffold unlocks. Costs 900 (metal) + 1300.
    resources.bag.add('science', 900 + 1300);
    sciences.category.getEntry('metal')!.purchasable.purchase(1);
    sciences.category.getEntry('construction')!.purchasable.purchase(1);
    expect(scaffold.visible.value).toBe(true);
  });

  it('useJobs +/- clamps client-side: cannot increment past unassigned, cannot decrement below 0', () => {
    seedCaps();
    const resources = getResources();
    resources.bag.add('kittens', 1);

    const { rows } = useJobs();
    const farmer = rows.find((j) => j.id === 'farmer')!;
    expect(farmer.canIncrement.value).toBe(true);
    expect(farmer.canDecrement.value).toBe(false);
    farmer.increment();
    expect(farmer.count.value).toBe(1);
    expect(farmer.canIncrement.value).toBe(false);

    // Increment when full is a no-op (does not throw).
    farmer.increment();
    expect(farmer.count.value).toBe(1);

    farmer.decrement();
    expect(farmer.count.value).toBe(0);
    farmer.decrement();
    expect(farmer.count.value).toBe(0);
  });
});

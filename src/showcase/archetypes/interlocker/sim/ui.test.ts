/**
 * UI composables — found-regression locks.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock observable behavior;
 * discovery is elsewhere. This is the `tug/sim` "structural invariant"
 * exception, not a balance-number lock and not a general unit-test suite —
 * the case below documents a bug that actually shipped (a UI composable
 * silently bypassing a module's modifier chain) and was found. New cases
 * land here only when they pin a found regression.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { provide, getCurrentInstance, defineComponent, type App } from 'vue';
import { createAdditiveModifier } from '@open-loop/engine';
import { createApp as createVueApp, h } from 'vue';
import { createInterlockerEngine } from '../boot';
import { getResources, getSciences } from '../modules';
import { useResources } from '../ui/composables/useResources';
import { useBuildings } from '../ui/composables/useBuildings';

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

describe('interlocker UI composables — found-regression locks', () => {
  let h: Harness;
  beforeEach(() => {
    h = bootInsideApp();
  });
  afterEach(() => {
    h.unmount();
  });

  it('buying a pasture moves the displayed catnip net rate (consumption discount), not just the simulated total', () => {
    // Regression: useResources() used to re-derive the per-kitten catnip
    // drain from the raw `catnipPerKittenPerSec` data constant, bypassing
    // `village.consumptionRateChain` entirely — so the readout never moved
    // when pasture (or any future consumption-discount building) was bought,
    // even though the underlying simulation was already correct.
    seedCaps();
    const resources = getResources();
    const sciences = getSciences();

    resources.bag.add('kittens', 5);
    resources.bag.add('science', 30 + 100);
    sciences.category.getEntry('calendar')!.purchasable.purchase(1);
    sciences.category.getEntry('agriculture')!.purchasable.purchase(1);

    resources.bag.add('catnip', 1000);
    resources.bag.add('wood', 1000);

    const rateBefore = Number(useResources().find((r) => r.id === 'catnip')!.rate!.value);

    const buildingRows = useBuildings(() => 1);
    const pasture = buildingRows.find((r) => r.id === 'pasture')!;
    expect(pasture.visible.value).toBe(true);
    pasture.buy(1);
    expect(pasture.count.value).toBe(1);

    const rateAfter = Number(useResources().find((r) => r.id === 'catnip')!.rate!.value);
    // 5 kittens × 4.25/sec × 0.5% pasture discount = 0.10625 catnip/sec less
    // drain — the net rate should rise by exactly that, not stay flat.
    expect(rateAfter - rateBefore).toBeCloseTo(0.10625, 6);
  });
});

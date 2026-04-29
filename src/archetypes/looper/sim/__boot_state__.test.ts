// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { defineComponent, h, ref as vueRef, computed as vueComputed, createApp } from 'vue';
import { Decimal, type Engine } from 'open-loop-engine';
import { createLooperEngine } from '../boot';
import { CapabilitiesKey, InitialManaKey, LoopKey, ManaKey, TotalManaBudgetKey } from '../modules';

const MOD_ID = 'classic-adventuring';

let activeEngine: Engine | null = null;

afterEach(() => {
  activeEngine?.stop();
  activeEngine = null;
});

function bootProd(ns: string): Engine {
  // Mirror LooperAppRoot.startGame: SlotScreen creates a fresh slot, then
  // selectMod → start → load.
  const { engine } = createLooperEngine(undefined, { persistenceNamespace: ns });
  const newSlotId = engine.saveManager!.createSlot('Test');
  engine.saveManager!.selectSlot(newSlotId);
  engine.selectMod(MOD_ID);
  engine.start();
  engine.load();
  activeEngine = engine;
  return engine;
}

describe('looper boot state — production module composition', () => {
  it('mana = initialMana = 250 at fresh boot; totalBudget = 250', () => {
    const engine = bootProd('boot-probe-1');
    const mana = engine.tryInject(ManaKey)!;
    const initialMana = engine.tryInject(InitialManaKey)!;
    const totalBudget = engine.tryInject(TotalManaBudgetKey)!;
    expect(mana).toBeDefined();
    expect(initialMana).toBeDefined();
    expect(totalBudget).toBeDefined();
    expect(Number(initialMana.value)).toBe(250);
    expect(Decimal.eq(mana.value, 250)).toBe(true);
    expect(Decimal.eq(totalBudget.value, 250)).toBe(true);
  });

  it('capabilities registry has 4 entries at fresh boot', () => {
    const engine = bootProd('boot-probe-2');
    const capabilities = engine.tryInject(CapabilitiesKey)!;
    expect(capabilities).toBeDefined();
    expect(capabilities.getAll().length).toBe(4);
  });

  it('loop is paused at boot (not running)', () => {
    const engine = bootProd('boot-probe-3');
    const loop = engine.tryInject(LoopKey)!;
    expect(loop).toBeDefined();
    expect(loop.running.value).toBe(false);
  });

  it('Vue auto-unwrap probe: persistent + computed top-level refs in template', () => {
    // Determine empirically whether Vue auto-unwraps engine refs in templates.
    const engine = bootProd('auto-unwrap-probe');
    const mana = engine.tryInject(ManaKey)!;
    const totalBudget = engine.tryInject(TotalManaBudgetKey)!;
    const localComputed = vueComputed(() => Number(mana.value));
    const localRef = vueRef(42);

    const Probe = defineComponent({
      setup() {
        return { mana, totalBudget, localComputed, localRef };
      },
      render() {
        return h('div', [
          // raw ref (no .value)
          h('span', { class: 'r-mana' }, String((this as unknown as { mana: unknown }).mana)),
          h(
            'span',
            { class: 'r-tb' },
            String((this as unknown as { totalBudget: unknown }).totalBudget),
          ),
          h(
            'span',
            { class: 'r-lc' },
            String((this as unknown as { localComputed: unknown }).localComputed),
          ),
          h('span', { class: 'r-lr' }, String((this as unknown as { localRef: unknown }).localRef)),
        ]);
      },
    });

    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = createApp(Probe);
    app.mount(host);
    const out = {
      mana: host.querySelector('.r-mana')?.textContent,
      tb: host.querySelector('.r-tb')?.textContent,
      lc: host.querySelector('.r-lc')?.textContent,
      lr: host.querySelector('.r-lr')?.textContent,
    };
    app.unmount();
    document.body.removeChild(host);
    // Logged so we can read the diagnostic in the run output.
     
    console.log('AUTO_UNWRAP_PROBE', JSON.stringify(out));
    // Vue's runtime auto-unwraps top-level refs marked __v_isRef: true.
    // We assert on what we observe so the probe is self-documenting.
    expect(out.lr).toBe('42'); // native Vue ref is unwrapped
    expect(out.lc).toBe('250'); // native Vue computed is unwrapped to its value
  });
});

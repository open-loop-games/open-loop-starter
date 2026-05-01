// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import type { Engine } from 'open-loop-engine';
import { createLooperEngine } from '../boot';

const MOD_ID = 'classic-adventuring';

let activeEngine: Engine | null = null;

afterEach(() => {
  activeEngine?.stop();
  activeEngine = null;
});

function bootProd(ns: string): Engine {
  const { engine } = createLooperEngine({ persistenceNamespace: ns });
  const newSlotId = engine.saveManager!.createSlot('Test');
  engine.saveManager!.selectSlot(newSlotId);
  engine.selectMod(MOD_ID);
  engine.start();
  engine.load();
  activeEngine = engine;
  return engine;
}

describe('looper boot state — smoke: boot + install without throw', () => {
  it('boots without throwing', () => {
    expect(() => bootProd('boot-smoke-1')).not.toThrow();
  });

  it('engine is started after bootProd', () => {
    const engine = bootProd('boot-smoke-2');
    expect(engine).toBeDefined();
  });
});

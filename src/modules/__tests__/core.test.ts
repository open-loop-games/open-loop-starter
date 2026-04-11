import { describe, it, expect, afterEach } from 'vitest';
import { Decimal, createEngine, createMemoryStorage, type Engine } from 'open-loop-engine';
import { settingsModule } from '../settings';
import { uiRegistryModule } from '../ui-registry';
import { coreModule, coreState } from '../core';

const noopTimers = {
  setInterval: () => 0 as unknown as ReturnType<typeof globalThis.setInterval>,
  clearInterval: () => {},
};

function bootCore(namespace: string): Engine {
  const engine = createEngine({
    gameId: namespace,
    persistenceNamespace: namespace,
    storageAdapter: createMemoryStorage(),
    timerProvider: noopTimers,
    autoSaveInterval: 0,
  });
  engine.use(settingsModule);
  engine.use(uiRegistryModule);
  engine.use(coreModule);
  engine.start();
  return engine;
}

describe('coreModule', () => {
  let engine: Engine | undefined;

  afterEach(() => {
    engine?.stop();
    engine = undefined;
  });

  it('populates coreState on install', () => {
    engine = bootCore('core-test-install');
    expect(coreState).not.toBeNull();
    expect(coreState!.resources.wood).toBeDefined();
    expect(coreState!.resources.stone).toBeDefined();
    expect(coreState!.resources.gold).toBeDefined();
    expect(coreState!.skills.woodcutting).toBeDefined();
    expect(coreState!.skills.mining).toBeDefined();
    expect(coreState!.actions.size).toBe(6);
    expect(coreState!.achievements.list).toHaveLength(5);
  });

  it('starts resources at zero', () => {
    engine = bootCore('core-test-resources');
    const { wood, stone, gold } = coreState!.resources;
    expect(Decimal.eq(wood.value, 0)).toBe(true);
    expect(Decimal.eq(stone.value, 0)).toBe(true);
    expect(Decimal.eq(gold.value, 0)).toBe(true);
  });

  it('wires upgrade effects at amount 0 to the additive base of 1', () => {
    engine = bootCore('core-test-upgrades');
    const { sharpAxe, ironPickaxe, foreman } = coreState!.upgrades;
    expect(Decimal.eq(sharpAxe.effect.value, 1)).toBe(true);
    expect(Decimal.eq(ironPickaxe.effect.value, 1)).toBe(true);
    expect(Decimal.eq(foreman.effect.value, 1)).toBe(true);
  });

  it('unlocks only the village zone at boot', () => {
    engine = bootCore('core-test-zones');
    const { zones } = coreState!;
    expect(zones.isUnlocked('village')).toBe(true);
    expect(zones.isUnlocked('forest')).toBe(false);
    expect(zones.isUnlocked('quarry')).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { Decimal, createEngine, createMemoryStorage, type Engine } from 'open-loop-engine';
import { settingsModule } from '../settings';
import { uiRegistryModule } from '../ui-registry';
import { gatheringModule, GatheringKey } from '../village-gatherer/gathering';
import { progressionModule, ProgressionKey } from '../village-gatherer/progression';
import { economyModule, EconomyKey } from '../village-gatherer/economy';

const noopTimers = {
  setInterval: () => 0 as unknown as ReturnType<typeof globalThis.setInterval>,
  clearInterval: () => {},
};

function boot(namespace: string): Engine {
  const engine = createEngine({
    gameId: namespace,
    persistenceNamespace: namespace,
    storageAdapter: createMemoryStorage(),
    timerProvider: noopTimers,
    autoSaveInterval: 0,
  });
  engine.use(settingsModule);
  engine.use(uiRegistryModule);
  engine.use(gatheringModule);
  engine.use(progressionModule);
  engine.use(economyModule);
  engine.start();
  return engine;
}

describe('domain modules', () => {
  let engine: Engine | undefined;

  afterEach(() => {
    engine?.stop();
    engine = undefined;
  });

  it('populates all domain states on install', () => {
    engine = boot('domain-test-install');
    const g = engine.tryInject(GatheringKey)!;
    const p = engine.tryInject(ProgressionKey)!;
    const e = engine.tryInject(EconomyKey)!;
    expect(g).toBeDefined();
    expect(g.resources.wood).toBeDefined();
    expect(g.resources.stone).toBeDefined();
    expect(g.resources.gold).toBeDefined();
    expect(g.skills.getSkill('woodcutting')).toBeDefined();
    expect(g.skills.getSkill('mining')).toBeDefined();
    expect(g.actions.size).toBe(6);
    expect(p.achievements.totalCount).toBe(5);
    expect(e.producers).toBeDefined();
    expect(e.upgrades.sharpAxe).toBeDefined();
  });

  it('starts resources at zero', () => {
    engine = boot('domain-test-resources');
    const { wood, stone, gold } = engine.tryInject(GatheringKey)!.resources;
    expect(Decimal.eq(wood.value, 0)).toBe(true);
    expect(Decimal.eq(stone.value, 0)).toBe(true);
    expect(Decimal.eq(gold.value, 0)).toBe(true);
  });

  it('wires upgrade effects at amount 0 to the additive base of 1', () => {
    engine = boot('domain-test-upgrades');
    const { sharpAxe, ironPickaxe, foreman } = engine.tryInject(EconomyKey)!.upgrades;
    expect(Decimal.eq(sharpAxe.effect.value, 1)).toBe(true);
    expect(Decimal.eq(ironPickaxe.effect.value, 1)).toBe(true);
    expect(Decimal.eq(foreman.effect.value, 1)).toBe(true);
  });

  it('unlocks only the village zone at boot', () => {
    engine = boot('domain-test-zones');
    const { zones } = engine.tryInject(GatheringKey)!;
    expect(zones.isUnlocked('village')).toBe(true);
    expect(zones.isUnlocked('forest')).toBe(false);
    expect(zones.isUnlocked('quarry')).toBe(false);
  });
});

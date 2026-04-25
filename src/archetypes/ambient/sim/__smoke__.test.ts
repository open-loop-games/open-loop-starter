import { describe, it, expect } from 'vitest';
import { CategoriesKey } from 'open-loop-engine';
import { createAmbientEngine } from '../boot';
import {
  AmbientTuningRegistryKey,
  AchievementsKey,
  AutoProducersKey,
  UnlocksKey,
  SceneKey,
  SessionClockKey,
  ArcKey,
} from '../modules';

describe('ambient engine smoke', () => {
  it('provides categories + tuning registry + per-module keys', () => {
    const { engine } = createAmbientEngine();
    engine.selectMod('cozy-farm');
    engine.start();
    const cats = engine.tryInject(CategoriesKey);
    const autoProducers = engine.tryInject(AutoProducersKey);
    const unlocks = engine.tryInject(UnlocksKey);
    expect(cats?.producers).toEqual([autoProducers]);
    expect(cats?.purchasables).toEqual([unlocks]);
    const reg = engine.tryInject(AmbientTuningRegistryKey);
    expect(reg?.has('balance/tier1BaseRate')).toBe(true);
    expect(reg?.has('balance/achievementMultiplier')).toBe(true);
    expect(reg?.has('producers/planter/purchase/baseCost')).toBe(true);
    expect(reg?.has('producers/coop/purchase/baseCost')).toBe(true);
    expect(engine.tryInject(AutoProducersKey)?.getAll().length).toBe(5);
    expect(engine.tryInject(UnlocksKey)?.getAll().length).toBe(12);
    expect(engine.tryInject(AchievementsKey)?.getAll().length).toBe(20);
    expect(engine.tryInject(SceneKey)).toBeDefined();
    expect(engine.tryInject(SessionClockKey)).toBeDefined();
    expect(engine.tryInject(ArcKey)).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { CategoriesKey, Decimal } from 'open-loop-engine';
import { createLooperEngine } from '../boot';
import {
  ActionsKey,
  ArcKey,
  LoopKey,
  LooperTuningRegistryKey,
  ManaKey,
  ManaPoolMaxKey,
  QueueKey,
  SkillsKey,
  TimeSystemKey,
  ZonesKey,
} from '../modules';

describe('looper engine smoke', () => {
  it('provides categories + tuning registry + per-module keys', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-injection',
    });
    engine.selectMod('classic-adventuring');
    engine.start();
    const cats = engine.tryInject(CategoriesKey);
    const skills = engine.tryInject(SkillsKey);
    expect(cats?.skills).toEqual([skills]);
    const reg = engine.tryInject(LooperTuningRegistryKey);
    expect(reg?.has('balance/timeResourcePoolBase')).toBe(true);
    expect(reg?.has('actions/wander/baseCost')).toBe(true);
    expect(engine.tryInject(SkillsKey)?.getAll().length).toBe(5);
    expect(engine.tryInject(ZonesKey)?.ordered.value.length).toBe(4);
    expect(engine.tryInject(ActionsKey)?.getAll().length).toBe(16);
    expect(engine.tryInject(LoopKey)).toBeDefined();
    expect(engine.tryInject(ArcKey)).toBeDefined();
    expect(engine.tryInject(QueueKey)).toBeDefined();
    expect(engine.tryInject(TimeSystemKey)).toBeDefined();
  });

  it('mana drains while loop runs and refills on restart', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-mana',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const mana = engine.tryInject(ManaKey)!;
    const poolMax = engine.tryInject(ManaPoolMaxKey)!;
    const loop = engine.tryInject(LoopKey)!;

    expect(loop.running.value).toBe(true);
    expect(Decimal.eq(mana.value, poolMax.value)).toBe(true);

    // Step 100s; mana should drop by ~100.
    for (let i = 0; i < 100; i++) {
      engine.loop.simulateTick(1);
    }
    expect(Decimal.lt(mana.value, poolMax.value)).toBe(true);

    // End the loop manually; mana should refill.
    loop.end();
    expect(Decimal.eq(mana.value, poolMax.value)).toBe(true);
    expect(loop.count.value).toBe(1);
  });

  it('queueing wander, ticking, completing grants combat XP', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-queue',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const skills = engine.tryInject(SkillsKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    queue.enqueue({ id: 'wander', metadata: { loops: 1, remaining: 1 } });

    // Wander base cost = 100 mana = 100 sim-seconds at level 0. Step a bit
    // past that; first completion should fire and grant 5 combat XP.
    for (let i = 0; i < 105; i++) {
      engine.loop.simulateTick(1);
    }

    const combatState = skills.getState('combat')!;
    expect(Decimal.gte(combatState.gen.xp.value, 5)).toBe(true);
    expect(actions.getTimesCompleted('wander')).toBeGreaterThanOrEqual(1);
  });

  it('instinct XP persists across loop reset (retention policy)', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-retention',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const skills = engine.tryInject(SkillsKey)!;
    const loop = engine.tryInject(LoopKey)!;

    // Queue wander 3 times so we get 15 combat gen XP and 0.15 instinct XP.
    queue.enqueue({ id: 'wander', metadata: { loops: 3, remaining: 3 } });
    for (let i = 0; i < 320; i++) {
      engine.loop.simulateTick(1);
    }
    const combatState = skills.getState('combat')!;
    const instinctBefore = Decimal.add(combatState.instinct.xp.value, 0);

    expect(Decimal.gt(instinctBefore, 0)).toBe(true);

    // Reset the loop. gen XP zeros; instinct XP survives.
    loop.end();
    expect(Decimal.eq(combatState.gen.xp.value, 0)).toBe(true);
    expect(Decimal.eq(combatState.instinct.xp.value, instinctBefore)).toBe(true);
  });
});

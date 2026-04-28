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

  it('loop N+1 first-action sim-time < loop N first-action after instinct accrual', () => {
    // Verifies the cost-side retention wiring closes (OL-738 deliverable 6).
    // Overrides accelerate the effect's visibility so a smoke-scale run lands
    // a non-zero instinct.level inside loop 1 — at default `instinctXpRatio:
    // 0.01` and `retentionDivisor: 30`, an observable delta would need
    // dozens of natural loops. Default constants exercise the same code
    // path; this just compresses the timeline.
    const { engine } = createLooperEngine(
      { balance: { instinctXpRatio: 1.0, retentionDivisor: 10 } },
      { persistenceNamespace: 'smoke-retention-wiring' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const skills = engine.tryInject(SkillsKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    // Loop 1: enough queued wanders to outlast the mana pool.
    queue.enqueue({ id: 'wander', metadata: { loops: 100, remaining: 100 } });

    let loop1FirstCompletionTicks = 0;
    for (let t = 1; t <= 200; t++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('wander') >= 1) {
        loop1FirstCompletionTicks = t;
        break;
      }
    }
    expect(loop1FirstCompletionTicks).toBeGreaterThan(0);

    // Drain remaining mana to natural loop end + auto-restart. createLoop's
    // onRestart runs in the engine's tick path (no explicit loop.run()).
    let safety = 0;
    while (loop.count.value < 1 && safety++ < 10000) {
      engine.loop.simulateTick(1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(1);

    // Retention precondition — no instinct, no observable delta.
    expect(Number(skills.getState('combat')!.instinct.level.value)).toBeGreaterThan(0);

    // Loop 2: snapshot cumulative count, measure ticks to next completion.
    const completionsBeforeLoop2 = actions.getTimesCompleted('wander');
    let loop2FirstCompletionTicks = 0;
    for (let t = 1; t <= 200; t++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('wander') > completionsBeforeLoop2) {
        loop2FirstCompletionTicks = t;
        break;
      }
    }
    expect(loop2FirstCompletionTicks).toBeGreaterThan(0);

    // The wiring closure: loop 2's first wander completes faster because
    // instinct.level > 0 → instinct.modifier.apply(1) > 1 → effectiveCost
    // is smaller. Asserts the path; calibration probe stays in OL-737.
    expect(loop2FirstCompletionTicks).toBeLessThan(loop1FirstCompletionTicks);
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

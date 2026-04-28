import { describe, it, expect } from 'vitest';
import { CategoriesKey, Decimal } from 'open-loop-engine';
import { createLooperEngine } from '../boot';
import {
  ActionsKey,
  ArcKey,
  CapabilitiesKey,
  InitialManaKey,
  LoopKey,
  LooperTuningRegistryKey,
  ManaKey,
  QueueKey,
  QueueRepeatLastActionKey,
  QueueShouldRestartKey,
  TimeSystemKey,
  TotalManaBudgetKey,
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
    const capabilities = engine.tryInject(CapabilitiesKey);
    expect(cats?.skills).toEqual([capabilities]);
    const reg = engine.tryInject(LooperTuningRegistryKey);
    expect(reg?.has('balance/initialMana')).toBe(true);
    expect(reg?.has('balance/costDivisor')).toBe(true);
    expect(reg?.has('balance/talentAccrualRatio')).toBe(true);
    expect(reg?.has('actions/stretch/manaCost')).toBe(true);
    expect(capabilities?.getAll().length).toBe(4);
    expect(engine.tryInject(ZonesKey)?.ordered.value.length).toBe(4);
    expect(engine.tryInject(ActionsKey)?.getAll().length).toBe(16);
    expect(engine.tryInject(LoopKey)).toBeDefined();
    expect(engine.tryInject(ArcKey)).toBeDefined();
    expect(engine.tryInject(QueueKey)).toBeDefined();
    expect(engine.tryInject(TimeSystemKey)).toBeDefined();
    expect(engine.tryInject(QueueShouldRestartKey)).toBeDefined();
    expect(engine.tryInject(QueueRepeatLastActionKey)).toBeDefined();
    expect(engine.tryInject(TotalManaBudgetKey)).toBeDefined();
  });

  it('boot with empty queue: loop paused, mana frozen at initialMana', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-empty-queue-paused',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const mana = engine.tryInject(ManaKey)!;
    const initialMana = engine.tryInject(InitialManaKey)!;
    const loop = engine.tryInject(LoopKey)!;

    expect(loop.running.value).toBe(false);
    expect(Decimal.eq(mana.value, initialMana.value)).toBe(true);

    // Tick repeatedly with no queue items — mana must not move.
    for (let i = 0; i < 50; i++) engine.loop.simulateTick(1);
    expect(Decimal.eq(mana.value, initialMana.value)).toBe(true);
    expect(loop.running.value).toBe(false);
  });

  it('first enqueue auto-starts the loop and mana begins draining', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-auto-start',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const mana = engine.tryInject(ManaKey)!;
    const initialMana = engine.tryInject(InitialManaKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const queue = engine.tryInject(QueueKey)!;

    expect(loop.running.value).toBe(false);

    queue.enqueue({ id: 'stretch', metadata: { loops: 100, loopsLeft: 100 } });
    expect(loop.running.value).toBe(true);

    // 5 sim-seconds × 20 ticks/sec = 100 ticks of drain → mana drops below pool.
    for (let i = 0; i < 5; i++) engine.loop.simulateTick(1);
    expect(Decimal.lt(mana.value, initialMana.value)).toBe(true);
  });

  it('first action completes and grants capability XP via canonical formula', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-queue',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const capabilities = engine.tryInject(CapabilitiesKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    // Stretch: manaCost 60, weights {vigor: 1}, expMult 1. At Level 0:
    //   adjustedTicks = ceil(60 × 1) = 60
    //   adjustedExp   = 1 × (60/60) = 1
    //   vigor xp gain = 1 × 1 × 1 (talentMult initial) = 1
    queue.enqueue({ id: 'stretch', metadata: { loops: 1, loopsLeft: 1 } });

    // Capture vigor.xp the iteration after completion fires (next tick the
    // cursor walks off → shouldRestart → reset zeroes Level XP).
    const vigorState = capabilities.getState('vigor')!;
    let xpAtCompletion = new Decimal(0);
    for (let t = 1; t <= 10; t++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('stretch') >= 1) {
        xpAtCompletion = new Decimal(vigorState.level.xp.value);
        break;
      }
    }
    expect(actions.getTimesCompleted('stretch')).toBeGreaterThanOrEqual(1);
    // Canonical formula yields 1 XP per stretch completion at Level 0 / Talent 0.
    expect(Decimal.gte(xpAtCompletion, 1)).toBe(true);
  });

  it('cursor-walked plan replays each loop (3 items × 2 loops = 6 dispatches/run)', () => {
    // Costs compressed so 6 completions fit in a 250-tick budget.
    //   stretch  ×2 of cost 30 = 60
    //   listen   ×2 of cost 30 = 60 (and grants 50 mana on completion)
    //   tend     ×2 of cost 30 = 60
    // Total ~180 ticks of work + 100 mana from grants — comfortably finishes
    // before mana exhaustion, exits via cursor-end shouldRestart.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'stretch', manaCost: 30 },
          { id: 'listen', manaCost: 30 },
          { id: 'tend', manaCost: 30 },
        ],
      },
      { persistenceNamespace: 'smoke-cursor-plan-replay' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    queue.enqueue({ id: 'stretch', metadata: { loops: 2, loopsLeft: 2 } });
    queue.enqueue({ id: 'listen', metadata: { loops: 2, loopsLeft: 2 } });
    queue.enqueue({ id: 'tend', metadata: { loops: 2, loopsLeft: 2 } });

    // Step long enough for two full passes. If the queue lost its plan
    // after first exhaustion (the bug the cursor-walk fixes), counts stop at 6.
    let safety = 0;
    while (loop.count.value < 2 && safety++ < 4000) {
      engine.loop.simulateTick(0.1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(2);

    expect(actions.getTimesCompleted('stretch')).toBeGreaterThanOrEqual(4);
    expect(actions.getTimesCompleted('listen')).toBeGreaterThanOrEqual(4);
    expect(actions.getTimesCompleted('tend')).toBeGreaterThanOrEqual(4);

    // After two restarts the plan still has its 3 items (cursor-walked, not popped).
    expect(queue.items.value.length).toBe(3);
    for (const item of queue.items.value) {
      expect(item.metadata.loopsLeft).toBe(item.metadata.loops);
    }
  });

  it('mid-run queue clear ends the loop (vanilla shouldRestart on empty)', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-midrun-clear',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const mana = engine.tryInject(ManaKey)!;
    const initialMana = engine.tryInject(InitialManaKey)!;

    queue.enqueue({ id: 'stretch', metadata: { loops: 100, loopsLeft: 100 } });
    for (let i = 0; i < 3; i++) engine.loop.simulateTick(1);
    expect(loop.running.value).toBe(true);

    const startCount = loop.count.value;
    queue.clear();
    // Empty queue → next dispatch attempt fails → shouldRestart fires → end()
    // is invoked from within endCondition on a tick. After the restart,
    // `resetForLoop()` finds zero items and pauses the loop.
    for (let i = 0; i < 5; i++) engine.loop.simulateTick(1);

    expect(loop.count.value).toBe(startCount + 1);
    expect(loop.running.value).toBe(false);
    expect(Decimal.eq(mana.value, initialMana.value)).toBe(true);
  });

  it('repeat-last-action keeps the last item running past plan exhaustion', () => {
    // Tiny cost so many completions fire before mana drains.
    const { engine } = createLooperEngine(
      { actions: [{ id: 'stretch', manaCost: 20 }] },
      { persistenceNamespace: 'smoke-repeat-last' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const repeat = engine.tryInject(QueueRepeatLastActionKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    repeat.value = true;

    queue.enqueue({ id: 'stretch', metadata: { loops: 1, loopsLeft: 1 } });

    // Drive past the plan (1 stretch nominal) through mana exhaustion. With
    // repeat-last on, stretch should keep firing until mana drains rather
    // than triggering an immediate cursor-exhaustion restart.
    let safety = 0;
    while (loop.count.value < 1 && safety++ < 5000) {
      engine.loop.simulateTick(0.1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(1);

    // Way more than 1 completion before the loop ended on mana — proves
    // the repeat extension fired.
    expect(actions.getTimesCompleted('stretch')).toBeGreaterThan(5);
  });

  it('Talent multiplies Level XP gain rate on subsequent loops (canonical role separation)', () => {
    // Direct upstream signal: with talentAccrualRatio cranked, Level XP per
    // completion in loop 2 strictly exceeds Level XP per completion in loop 1
    // (the `xpGain = weight × adjustedExp × talentMult` formula's output).
    //
    // The downstream "cost reduction perceptibility" requires many loops at
    // costDivisor=100 before Level reaches a value that beats `ceil()`'s
    // rounding floor — that's the balance leaf's solver-driven probe (OL-746).
    const { engine } = createLooperEngine(
      { balance: { talentAccrualRatio: 1.0 } },
      { persistenceNamespace: 'smoke-talent-compounding' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const capabilities = engine.tryInject(CapabilitiesKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    queue.enqueue({ id: 'stretch', metadata: { loops: 100, loopsLeft: 100 } });

    // Loop 1: capture Level XP after first completion (Level XP zeroes per
    // loop, so this is the per-completion grant before Talent compounding).
    const vigorState = capabilities.getState('vigor')!;
    let xpAfterFirstLoop1 = new Decimal(0);
    for (let t = 1; t <= 10; t++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('stretch') >= 1) {
        xpAfterFirstLoop1 = new Decimal(vigorState.level.xp.value);
        break;
      }
    }
    expect(Decimal.gt(xpAfterFirstLoop1, 0)).toBe(true);

    // Drain to natural restart.
    let safety = 0;
    while (loop.count.value < 1 && safety++ < 10000) {
      engine.loop.simulateTick(1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(1);
    expect(Number(vigorState.talent.level.value)).toBeGreaterThan(0);

    // Loop 2: capture Level XP after first completion. talentMult > 1 ⇒
    // strictly larger XP grant.
    const completionsBeforeLoop2 = actions.getTimesCompleted('stretch');
    let xpAfterFirstLoop2 = new Decimal(0);
    for (let t = 1; t <= 10; t++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('stretch') > completionsBeforeLoop2) {
        xpAfterFirstLoop2 = new Decimal(vigorState.level.xp.value);
        break;
      }
    }
    expect(Decimal.gt(xpAfterFirstLoop2, xpAfterFirstLoop1)).toBe(true);
  });

  it('manaGrant on a mana-positive action extends the loop pool (no clamp)', () => {
    const { engine } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-mana-grant',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const mana = engine.tryInject(ManaKey)!;
    const initialMana = engine.tryInject(InitialManaKey)!;
    const totalBudget = engine.tryInject(TotalManaBudgetKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    // Plan: 1 stretch (60 ticks, mana-neutral) followed by 1 listen (100
    // ticks, +50 manaGrant). After both complete, totalBudget = initialMana +
    // 50 (the listen grant).
    queue.enqueue({ id: 'stretch', metadata: { loops: 1, loopsLeft: 1 } });
    queue.enqueue({ id: 'listen', metadata: { loops: 1, loopsLeft: 1 } });

    // Run until listen completes.
    for (let i = 0; i < 30; i++) {
      engine.loop.simulateTick(1);
      if (actions.getTimesCompleted('listen') >= 1) break;
    }
    expect(actions.getTimesCompleted('stretch')).toBeGreaterThanOrEqual(1);
    expect(actions.getTimesCompleted('listen')).toBeGreaterThanOrEqual(1);

    // totalBudget grew by the grant amount (no clamp at initialMana).
    expect(Decimal.gt(totalBudget.value, initialMana.value)).toBe(true);
    expect(Decimal.lte(mana.value, totalBudget.value)).toBe(true);
  });

  it('Talent XP persists across loop reset (retention policy)', () => {
    const { engine } = createLooperEngine(
      { balance: { talentAccrualRatio: 1.0 } },
      { persistenceNamespace: 'smoke-retention' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const capabilities = engine.tryInject(CapabilitiesKey)!;
    const loop = engine.tryInject(LoopKey)!;

    // Queue stretch a few times to accrue Vigor XP + Talent XP.
    queue.enqueue({ id: 'stretch', metadata: { loops: 3, loopsLeft: 3 } });
    for (let i = 0; i < 20; i++) {
      engine.loop.simulateTick(1);
    }
    const vigorState = capabilities.getState('vigor')!;
    const talentBefore = Decimal.add(vigorState.talent.xp.value, 0);

    expect(Decimal.gt(talentBefore, 0)).toBe(true);

    // Reset the loop. Level XP zeros; Talent XP survives.
    loop.end();
    expect(Decimal.eq(vigorState.level.xp.value, 0)).toBe(true);
    expect(Decimal.eq(vigorState.talent.xp.value, talentBefore)).toBe(true);
  });

  it('action-completion-count prereqs gate visibility (Stretch→Patrol chain)', () => {
    // Patrol carries a prereq `Stretch ≥ 3`. canStart is unset; the prereq
    // is on the `prereqs: ActionPrereq[]` field which gates visibility, not
    // dispatch — but checking the data shape is enough for the smoke pass
    // (visibility evaluation lives in UI / leaf-3 doc layer).
    const { engine, data } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-prereqs',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const patrol = data.actions.find((a) => a.id === 'patrol');
    expect(patrol).toBeDefined();
    expect(patrol!.prereqs).toEqual([
      { kind: 'action-completion-count', actionId: 'stretch', value: 3 },
    ]);
  });
});

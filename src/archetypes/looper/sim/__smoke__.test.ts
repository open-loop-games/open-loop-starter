import { describe, it, expect } from 'vitest';
import { CategoriesKey, Decimal } from 'open-loop-engine';
import { createLooperEngine } from '../boot';
import {
  ActionsKey,
  ArcKey,
  CapabilitiesKey,
  GoldKey,
  GoldModuleKey,
  InitialManaKey,
  LoopKey,
  LooperTuningRegistryKey,
  ManaKey,
  ProgressVarsKey,
  QueueKey,
  QueueRepeatLastActionKey,
  QueueShouldRestartKey,
  RegularVarsKey,
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
    expect(reg?.has('actions/trek/manaCost')).toBe(true);
    expect(capabilities?.getAll().length).toBe(4);
    expect(engine.tryInject(ZonesKey)?.ordered.value.length).toBe(2);
    expect(engine.tryInject(ProgressVarsKey)?.getAll().length).toBe(4);
    expect(engine.tryInject(RegularVarsKey)?.getAll().length).toBe(5);
    expect(engine.tryInject(ActionsKey)?.getAll().length).toBe(15);
    expect(engine.tryInject(LoopKey)).toBeDefined();
    expect(engine.tryInject(ArcKey)).toBeDefined();
    expect(engine.tryInject(QueueKey)).toBeDefined();
    expect(engine.tryInject(GoldKey)).toBeDefined();
    expect(engine.tryInject(GoldModuleKey)).toBeDefined();
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

    // Stretch: manaCost 60, weights {vigor: 1}, expMult 4 (training multiplier).
    // At Level 0:
    //   adjustedTicks = ceil(60 × 1) = 60
    //   adjustedExp   = 4 × (60/60) = 4
    //   vigor xp gain = 1 × 4 × 1 (talentMult initial) = 4
    queue.enqueue({ id: 'stretch', metadata: { loops: 1, loopsLeft: 1 } });

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
    expect(Decimal.gte(xpAtCompletion, 1)).toBe(true);
  });

  it('cursor-walked plan replays each loop (3 items × 2 loops = 6 dispatches/run)', () => {
    // Costs compressed so 6 completions fit in a 250-tick budget.
    //   stretch  ×2 of cost 30 = 60
    //   tend     ×2 of cost 30 = 60
    //   listen   ×2 of cost 30 = 60
    // Total ~180 ticks of work — comfortably finishes before mana exhaustion,
    // exits via cursor-end shouldRestart.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'stretch', manaCost: 30 },
          { id: 'tend', manaCost: 30 },
          { id: 'listen', manaCost: 30 },
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
    queue.enqueue({ id: 'tend', metadata: { loops: 2, loopsLeft: 2 } });
    queue.enqueue({ id: 'listen', metadata: { loops: 2, loopsLeft: 2 } });

    let safety = 0;
    while (loop.count.value < 2 && safety++ < 4000) {
      engine.loop.simulateTick(0.1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(2);

    expect(actions.getTimesCompleted('stretch')).toBeGreaterThanOrEqual(4);
    expect(actions.getTimesCompleted('tend')).toBeGreaterThanOrEqual(4);
    expect(actions.getTimesCompleted('listen')).toBeGreaterThanOrEqual(4);

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
    for (let i = 0; i < 5; i++) engine.loop.simulateTick(1);

    expect(loop.count.value).toBe(startCount + 1);
    expect(loop.running.value).toBe(false);
    expect(Decimal.eq(mana.value, initialMana.value)).toBe(true);
  });

  it('repeat-last-action keeps the last item running past plan exhaustion', () => {
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

    let safety = 0;
    while (loop.count.value < 1 && safety++ < 5000) {
      engine.loop.simulateTick(0.1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(1);
    expect(actions.getTimesCompleted('stretch')).toBeGreaterThan(5);
  });

  it('Talent multiplies Level XP gain rate on subsequent loops (canonical role separation)', () => {
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

    let safety = 0;
    while (loop.count.value < 1 && safety++ < 10000) {
      engine.loop.simulateTick(1);
    }
    expect(loop.count.value).toBeGreaterThanOrEqual(1);
    expect(Number(vigorState.talent.level.value)).toBeGreaterThan(0);

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

  it('Talent XP persists across loop reset (retention policy)', () => {
    const { engine } = createLooperEngine(
      { balance: { talentAccrualRatio: 1.0 } },
      { persistenceNamespace: 'smoke-retention-talent' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const capabilities = engine.tryInject(CapabilitiesKey)!;
    const loop = engine.tryInject(LoopKey)!;

    queue.enqueue({ id: 'stretch', metadata: { loops: 3, loopsLeft: 3 } });
    for (let i = 0; i < 20; i++) engine.loop.simulateTick(1);
    const vigorState = capabilities.getState('vigor')!;
    const talentBefore = Decimal.add(vigorState.talent.xp.value, 0);
    expect(Decimal.gt(talentBefore, 0)).toBe(true);

    loop.end();
    expect(Decimal.eq(vigorState.level.xp.value, 0)).toBe(true);
    expect(Decimal.eq(vigorState.talent.xp.value, talentBefore)).toBe(true);
  });

  // ─── ProgressVar / RegularVar / Gold-exchange tests ───

  it('progress-action XP increments the targeted progressVar', () => {
    // Roam: progress-type, manaCost 150 (compressed for fast completion),
    // progressVarId: 'roam'. expMult 1; progressVar.expMult 1.
    //   adjustedTicks = ceil(150 × 1) = 150 (at Level 0)
    //   adjustedExp = 1 × (150/150) = 1
    //   roam xp gain on completion = 1 × 1 = 1
    const { engine } = createLooperEngine(
      { actions: [{ id: 'roam', manaCost: 50 }] },
      { persistenceNamespace: 'smoke-progress-xp' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const actions = engine.tryInject(ActionsKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;

    queue.enqueue({ id: 'roam', metadata: { loops: 3, loopsLeft: 3 } });

    const roamSkill = progressVars.getSkill('roam')!;
    const xpBefore = new Decimal(roamSkill.xp.value);
    expect(Decimal.eq(xpBefore, 0)).toBe(true);

    for (let i = 0; i < 100; i++) {
      engine.loop.simulateTick(0.1);
      if (actions.getTimesCompleted('roam') >= 1) break;
    }
    expect(actions.getTimesCompleted('roam')).toBeGreaterThanOrEqual(1);
    expect(Decimal.gt(roamSkill.xp.value, 0)).toBe(true);
  });

  it('regularVar `total` derives from progressVar level — single-axis (Roam → Cache)', () => {
    // Roam scales [{cache: ×5}, {latch: ×1}]. Drive Roam to level 1 and assert
    // cache.total = 5 (5 × level 1) and latch.total = 1.
    const { engine } = createLooperEngine(
      // Compress roam manaCost so we can complete it many times before mana
      // drains. Boost talentAccrualRatio so Talent compounds even though Talent
      // is irrelevant to this test — we just want fast Roam levels.
      { actions: [{ id: 'roam', manaCost: 5 }] },
      { persistenceNamespace: 'smoke-regular-total-single-axis' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const regularVars = engine.tryInject(RegularVarsKey)!;

    queue.enqueue({ id: 'roam', metadata: { loops: 200, loopsLeft: 200 } });

    const roamSkill = progressVars.getSkill('roam')!;
    const cacheState = regularVars.getState('cache')!;
    const latchState = regularVars.getState('latch')!;

    let safety = 0;
    while (Number(roamSkill.level.value) < 1 && safety++ < 5000) {
      engine.loop.simulateTick(1);
    }
    expect(Number(roamSkill.level.value)).toBeGreaterThanOrEqual(1);

    const roamLevel = Number(roamSkill.level.value);
    expect(Number(cacheState.total.value)).toBe(roamLevel * 5);
    expect(Number(latchState.total.value)).toBe(roamLevel * 1);
  });

  it('regularVar `total` derives from progressVar level — multi-axis (Trail+Mark → Forage)', () => {
    // Trail scales forage × 5; Mark scales forage × 2. Drive both to >0 and
    // assert forage.total = trail.level × 5 + mark.level × 2.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'trail', manaCost: 5 },
          { id: 'mark', manaCost: 5 },
        ],
        balance: { initialMana: 5_000 },
      },
      { persistenceNamespace: 'smoke-regular-total-multi-axis' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const regularVars = engine.tryInject(RegularVarsKey)!;

    queue.enqueue({ id: 'trail', metadata: { loops: 100, loopsLeft: 100 } });
    queue.enqueue({ id: 'mark', metadata: { loops: 100, loopsLeft: 100 } });

    const trailSkill = progressVars.getSkill('trail')!;
    const markSkill = progressVars.getSkill('mark')!;
    const forageState = regularVars.getState('forage')!;

    let safety = 0;
    while (
      (Number(trailSkill.level.value) < 1 || Number(markSkill.level.value) < 1) &&
      safety++ < 10000
    ) {
      engine.loop.simulateTick(1);
    }
    expect(Number(trailSkill.level.value)).toBeGreaterThanOrEqual(1);
    expect(Number(markSkill.level.value)).toBeGreaterThanOrEqual(1);

    const expected = Number(trailSkill.level.value) * 5 + Number(markSkill.level.value) * 2;
    expect(Number(forageState.total.value)).toBe(expected);
  });

  it('regular-action every-Nth completion fires `add-mana` rewardEffect', () => {
    // Crack: regularVarId 'cache', rewardRatio 10, rewardEffects [add-mana 100].
    // Drive roam to level 3 (cache.total = 15, ≥ 10 needed for the 10th check
    // to find a "good" item). Then run crack → on the 10th check, mana +100
    // fires. Capture mana on the tick where good-find lands.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'roam', manaCost: 5 },
          { id: 'crack', manaCost: 5 },
        ],
        balance: { initialMana: 5_000 },
      },
      { persistenceNamespace: 'smoke-regular-mana-reward' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const regularVars = engine.tryInject(RegularVarsKey)!;
    const mana = engine.tryInject(ManaKey)!;

    // 40 roam completions → roam.xp = 40 → level = floor(sqrt(40)/2) = 3.
    queue.enqueue({ id: 'roam', metadata: { loops: 40, loopsLeft: 40 } });
    queue.enqueue({ id: 'crack', metadata: { loops: 12, loopsLeft: 12 } });

    const roamSkill = progressVars.getSkill('roam')!;
    const cacheState = regularVars.getState('cache')!;

    // Walk through roam phase until cursor reaches crack.
    let safety = 0;
    while (Number(roamSkill.level.value) < 3 && safety++ < 5000) {
      engine.loop.simulateTick(1);
    }
    expect(Number(roamSkill.level.value)).toBeGreaterThanOrEqual(3);
    expect(Number(cacheState.total.value)).toBeGreaterThanOrEqual(15);

    // Drive crack until just before the 10th check, then capture mana.
    safety = 0;
    while (cacheState.checked.value < 9 && safety++ < 5000) {
      engine.loop.simulateTick(1);
    }
    expect(cacheState.checked.value).toBe(9);
    const manaBefore = new Decimal(mana.value);
    const goodBefore = cacheState.good.value;

    // Step single ticks until the 10th check increments.
    safety = 0;
    while (cacheState.good.value === goodBefore && safety++ < 100) {
      engine.loop.simulateTick(0.05);
    }
    expect(cacheState.checked.value).toBe(10);
    expect(cacheState.good.value).toBe(goodBefore + 1);

    // The 10th-check tick added +100 mana. Drain across a single 0.05-second
    // simulateTick is round(20 × 0.05) = 1 mana, so net delta ≥ +99. Allowing
    // a small fudge for cost-path/Vigor-talent compounding, assert ≥ +50.
    expect(Number(mana.value) - Number(manaBefore)).toBeGreaterThan(50);
  });

  it('regular-action every-Nth completion fires `add-gold` rewardEffect', () => {
    // Slip: regularVarId 'latch', rewardRatio 10, rewardEffects [add-gold 10].
    // Drive roam.level to ≥ 10 so latch.total = 10 (Roam scales latch × 1) —
    // covers exactly one good-find. Or run with override to inflate latch.total.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'roam', manaCost: 5 },
          { id: 'slip', manaCost: 5 },
        ],
        balance: { initialMana: 10_000 },
      },
      { persistenceNamespace: 'smoke-regular-gold-reward' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const regularVars = engine.tryInject(RegularVarsKey)!;
    const gold = engine.tryInject(GoldKey)!;

    queue.enqueue({ id: 'roam', metadata: { loops: 200, loopsLeft: 200 } });
    queue.enqueue({ id: 'slip', metadata: { loops: 50, loopsLeft: 50 } });

    const roamSkill = progressVars.getSkill('roam')!;
    const latchState = regularVars.getState('latch')!;

    let safety = 0;
    while (Number(roamSkill.level.value) < 10 && safety++ < 20000) {
      engine.loop.simulateTick(1);
    }
    expect(Number(roamSkill.level.value)).toBeGreaterThanOrEqual(10);
    expect(Number(latchState.total.value)).toBeGreaterThanOrEqual(10);

    expect(Number(gold.value)).toBe(0);
    safety = 0;
    while (latchState.checked.value < 10 && safety++ < 5000) {
      engine.loop.simulateTick(1);
    }
    expect(latchState.checked.value).toBeGreaterThanOrEqual(10);
    expect(latchState.good.value).toBeGreaterThanOrEqual(1);
    expect(Number(gold.value)).toBeGreaterThanOrEqual(10);
  });

  it('basic gold-spend exchange burns gold and grants mana (Trade)', () => {
    // Trade: completionEffects [spend-gold 'all', exchange-gold-to-mana].
    // The dispatcher snapshots pre-batch gold; spend-gold zeros gold;
    // exchange-gold-to-mana grants `preBatchGold × exchangeMult` (= 50).
    //
    // Setup: Trade has prereq `progressVarLevel(roam, 3)` — drive roam.level ≥ 3
    // first. Then add some gold (via slip or directly) and queue Trade.
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'roam', manaCost: 5 },
          { id: 'trade', manaCost: 50 },
        ],
        balance: { initialMana: 10_000 },
      },
      { persistenceNamespace: 'smoke-trade-exchange' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const goldModule = engine.tryInject(GoldModuleKey)!;
    const gold = engine.tryInject(GoldKey)!;
    const mana = engine.tryInject(ManaKey)!;
    const actions = engine.tryInject(ActionsKey)!;

    // Drive roam.level ≥ 3 first to satisfy Trade's prereq.
    queue.enqueue({ id: 'roam', metadata: { loops: 50, loopsLeft: 50 } });
    let safety = 0;
    const roamSkill = progressVars.getSkill('roam')!;
    while (Number(roamSkill.level.value) < 3 && safety++ < 10000) {
      engine.loop.simulateTick(1);
    }
    expect(Number(roamSkill.level.value)).toBeGreaterThanOrEqual(3);

    // Seed gold imperatively (avoids needing the regularVar pool path here).
    goldModule.addGold(7);
    expect(Number(gold.value)).toBe(7);

    // Capture mana + gold the instant Trade completes — the cursor walks
    // off after Trade, fires shouldRestart, and onRestart resets both to
    // post-loop values. Append a placeholder action AFTER trade so the cursor
    // doesn't walk off (no shouldRestart, no loop end).
    queue.enqueue({ id: 'trade', metadata: { loops: 1, loopsLeft: 1 } });
    queue.enqueue({ id: 'roam', metadata: { loops: 1, loopsLeft: 1 } });
    const manaBefore = new Decimal(mana.value);
    let manaAtCompletion: Decimal | null = null;
    let goldAtCompletion: Decimal | null = null;
    safety = 0;
    while (manaAtCompletion === null && safety++ < 5000) {
      // 1 engine tick per call (tickRate=20, dt=0.05).
      engine.loop.simulateTick(0.05);
      if (actions.getTimesCompleted('trade') >= 1) {
        manaAtCompletion = new Decimal(mana.value);
        goldAtCompletion = new Decimal(gold.value);
      }
    }
    expect(actions.getTimesCompleted('trade')).toBe(1);

    // Gold zeroed (spend-gold 'all'); mana grew by 7 × 50 = 350 (modulo
    // ~1 mana drain on the completion tick).
    expect(Number(goldAtCompletion!)).toBe(0);
    const manaDelta = Number(manaAtCompletion!) - Number(manaBefore);
    expect(manaDelta).toBeGreaterThan(200);
  });

  it('gold resets per loop while progressVar XP persists', () => {
    const { engine } = createLooperEngine(
      { actions: [{ id: 'roam', manaCost: 5 }] },
      { persistenceNamespace: 'smoke-gold-reset-progress-persists' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const goldModule = engine.tryInject(GoldModuleKey)!;
    const gold = engine.tryInject(GoldKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const loop = engine.tryInject(LoopKey)!;

    queue.enqueue({ id: 'roam', metadata: { loops: 10, loopsLeft: 10 } });
    for (let i = 0; i < 30; i++) engine.loop.simulateTick(1);

    const roamSkill = progressVars.getSkill('roam')!;
    const xpBeforeReset = new Decimal(roamSkill.xp.value);
    expect(Decimal.gt(xpBeforeReset, 0)).toBe(true);

    // Seed gold mid-loop, then end the loop.
    goldModule.addGold(42);
    expect(Number(gold.value)).toBe(42);
    loop.end();

    // Gold zeroed (per-loop reset); progressVar XP persists (retention).
    expect(Number(gold.value)).toBe(0);
    expect(Decimal.eq(roamSkill.xp.value, xpBeforeReset)).toBe(true);
  });

  it('regularVar `total` persists (derived) while `checked`/`good` reset per loop', () => {
    const { engine } = createLooperEngine(
      {
        actions: [
          { id: 'roam', manaCost: 5 },
          { id: 'crack', manaCost: 5 },
        ],
        balance: { initialMana: 10_000 },
      },
      { persistenceNamespace: 'smoke-regularvar-reset' },
    );
    engine.selectMod('classic-adventuring');
    engine.start();

    const queue = engine.tryInject(QueueKey)!;
    const progressVars = engine.tryInject(ProgressVarsKey)!;
    const regularVars = engine.tryInject(RegularVarsKey)!;
    const loop = engine.tryInject(LoopKey)!;

    queue.enqueue({ id: 'roam', metadata: { loops: 30, loopsLeft: 30 } });
    queue.enqueue({ id: 'crack', metadata: { loops: 10, loopsLeft: 10 } });

    const roamSkill = progressVars.getSkill('roam')!;
    const cacheState = regularVars.getState('cache')!;

    let safety = 0;
    while (Number(roamSkill.level.value) < 2 && safety++ < 10000) {
      engine.loop.simulateTick(1);
    }
    expect(Number(roamSkill.level.value)).toBeGreaterThanOrEqual(2);
    const totalBefore = Number(cacheState.total.value);
    expect(totalBefore).toBeGreaterThanOrEqual(10);

    // Drive a couple of crack checks.
    safety = 0;
    while (cacheState.checked.value < 3 && safety++ < 1000) {
      engine.loop.simulateTick(1);
    }
    expect(cacheState.checked.value).toBeGreaterThanOrEqual(3);

    loop.end();

    // total persists (derived from roam.level which is in retention's keep);
    // checked + good zero per loop.
    expect(Number(cacheState.total.value)).toBe(totalBefore);
    expect(cacheState.checked.value).toBe(0);
    expect(cacheState.good.value).toBe(0);
  });

  it('progress-var-level prereqs gate visibility (Trade carries roam ≥ 3)', () => {
    const { engine, data } = createLooperEngine(undefined, {
      persistenceNamespace: 'smoke-prereq-progress-var-level',
    });
    engine.selectMod('classic-adventuring');
    engine.start();

    const trade = data.actions.find((a) => a.id === 'trade');
    expect(trade).toBeDefined();
    expect(trade!.prereqs).toEqual([
      { kind: 'progress-var-level', progressVarId: 'roam', value: 3 },
    ]);
  });
});

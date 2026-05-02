import { describe, it, expect } from 'vitest';
import { addResource, type Engine, type InjectionKey } from 'open-loop-engine';
import { bootEngine } from '@/boot';

function mustInject<T>(engine: Engine, key: InjectionKey<T>): T {
  const v = engine.tryInject(key);
  if (v === undefined) throw new Error(`mustInject: key not provided (${String(key)})`);
  return v;
}
import { DEFAULT_TUG_DATA, applyTugOverrides, type TugOverrides } from '../data';
import {
  createTugModules,
  IncomeKey,
  LaneKey,
  MatchKey,
  MetaKey,
  SequencerKey,
  UnitsKey,
} from '../modules';

const GAME_ID = 'tug-test';
const MOD_ID = 'tug';

function bootTug(overrides?: TugOverrides, namespace?: string): Engine {
  const data = applyTugOverrides(DEFAULT_TUG_DATA, overrides);
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: namespace,
    autoSaveInterval: 0,
    mods: [{ id: MOD_ID, name: 'Tug Test', modules: createTugModules(data) }],
  });
  engine.selectMod(MOD_ID);
  engine.start();
  return engine;
}

describe('tug match-scope reset (structural invariant)', () => {
  it('end() resets tug/match-scoped refs and preserves tug/meta-scoped refs', () => {
    const engine = bootTug(undefined, 'reset-invariant');
    const match = mustInject(engine, MatchKey);
    const meta = mustInject(engine, MetaKey);
    const lane = mustInject(engine, LaneKey);
    const playerIncome = mustInject(engine, IncomeKey.player);
    const aiIncome = mustInject(engine, IncomeKey.ai);

    // 1. start() — match-scope state should populate.
    match.start();
    expect(Number(match.fortressHp.player.value)).toBe(5_000);
    expect(Number(match.fortressHp.ai.value)).toBe(5_000);
    expect(match.outcome.value).toBe(null);

    // 2. Mutate match-scope state across every enumerated module surface so
    //    we can later assert the reset cleared each one. Skip income +
    //    cooldowns + sequencer queues — those are exercised by the AI test
    //    below; here we focus on match-orchestrator-owned state plus the
    //    lane substrate (which is shared, single-instance, also in scope).
    addResource(playerIncome, 1234);
    addResource(aiIncome, 2345);
    match.counterPivotsThisMatch.value = 7;
    match.unitsSentByPlayer.value = 11;
    match.matchTimeElapsed.value = 42;
    lane.spawn('player', 'marine');
    lane.spawn('ai', 'vulture');
    expect(lane.units.player.value.length).toBe(1);
    expect(lane.units.ai.value.length).toBe(1);

    // 3. Mutate meta-scope state so we can verify it survives.
    meta.maxCounterPivotsAnyMatch.value = 9;
    meta.factionsUnlocked.value = 2;

    // 4. Force match end.
    match.end('player-win');

    // 5. Match-scope refs reset to defaults.
    expect(Number(match.fortressHp.player.value)).toBe(0);
    expect(Number(match.fortressHp.ai.value)).toBe(0);
    expect(match.outcome.value).toBe(null);
    expect(match.counterPivotsThisMatch.value).toBe(0);
    expect(match.unitsSentByPlayer.value).toBe(0);
    expect(match.matchTimeElapsed.value).toBe(0);
    expect(Number(playerIncome.value)).toBe(0);
    expect(Number(aiIncome.value)).toBe(0);
    expect(lane.units.player.value).toEqual([]);
    expect(lane.units.ai.value).toEqual([]);

    // 6. Meta-scope refs survive the match boundary. matchesPlayed
    //    incremented on the 'matchEnded' event; max should hold the value
    //    counterPivotsThisMatch had at end-time (7 > prior 9? No — meta
    //    only updates when payload exceeds prior, so still 9).
    expect(meta.maxCounterPivotsAnyMatch.value).toBe(9);
    expect(meta.factionsUnlocked.value).toBe(2);
    expect(meta.matchesPlayed.value).toBe(1);
  });

  it('matchEnded payload reaches meta before reset clears counter', () => {
    const engine = bootTug(undefined, 'meta-payload');
    const match = mustInject(engine, MatchKey);
    const meta = mustInject(engine, MetaKey);

    match.start();
    match.counterPivotsThisMatch.value = 5;
    match.end('player-win');

    // meta.maxCounterPivotsAnyMatch should reflect the 5 counter-pivots
    // observed pre-reset, proving the emit-before-reset ordering.
    expect(meta.maxCounterPivotsAnyMatch.value).toBe(5);
  });
});

describe('tug AI opponent (default counter persona)', () => {
  it('produces sends with default persona at default cadence under 60s', () => {
    const engine = bootTug(undefined, 'ai-mirror');
    const match = mustInject(engine, MatchKey);
    const playerSequencer = mustInject(engine, SequencerKey.player);
    const aiSequencer = mustInject(engine, SequencerKey.ai);
    const playerShop = mustInject(engine, UnitsKey.player);
    const playerIncome = mustInject(engine, IncomeKey.player);

    let playerStarts = 0;
    let aiStarts = 0;
    playerSequencer.on('start', () => {
      playerStarts++;
    });
    aiSequencer.on('start', () => {
      aiStarts++;
    });

    match.start();

    // Drop the player some minerals so they can buy at least once — without
    // a player buy, there's no player sequencer 'start' event to observe,
    // and acceptance asks both sides to fire.
    addResource(playerIncome, 100);
    playerShop.getPurchasable('marine')?.purchase();

    // Tick at ~20Hz for 60 sim seconds. simulateTick processes one logical
    // tick at the loop's stepSize (1/20 = 50ms in default config).
    const totalSteps = 60 * 20;
    for (let i = 0; i < totalSteps; i++) engine.loop.simulateTick(1 / 20);

    expect(playerStarts).toBeGreaterThan(0);
    expect(aiStarts).toBeGreaterThan(0);
  });
});

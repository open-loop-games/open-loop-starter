import { describe, it, expect, beforeEach } from 'vitest';
import { addResource } from '@open-loop/engine';
import { boot, getEngine, tick, INTERVAL_RATE } from './harness';
import { getIncome, getUnits, LaneKey, MatchKey, MetaKey, SequencerKey } from '../modules';

/**
 * Match-scope reset is a structural invariant spanning every match-scoped
 * module, so it lives in `sim/` rather than beside any one of them: what it
 * specs is the boundary itself — which refs clear on `end()` and which survive
 * it — not the behavior of the modules that own them.
 */

beforeEach(() => boot());

function match() {
  return getEngine().tryInject(MatchKey)!;
}
function meta() {
  return getEngine().tryInject(MetaKey)!;
}
function lane() {
  return getEngine().tryInject(LaneKey)!;
}

describe('tug match-scope reset (structural invariant)', () => {
  it('end() resets tug/match-scoped refs and preserves tug/meta-scoped refs', () => {
    const playerIncome = getIncome('player');
    const aiIncome = getIncome('ai');

    // 1. start() — match-scope state should populate.
    match().start();
    expect(Number(match().fortressHp.player.value)).toBe(5_000);
    expect(Number(match().fortressHp.ai.value)).toBe(5_000);
    expect(match().outcome.value).toBe(null);

    // 2. Mutate match-scope state across every enumerated module surface so
    //    we can later assert the reset cleared each one. Skip income +
    //    cooldowns + sequencer queues — those are exercised by the AI test
    //    below; here we focus on match-orchestrator-owned state plus the
    //    lane substrate (which is shared, single-instance, also in scope).
    addResource(playerIncome, 1234);
    addResource(aiIncome, 2345);
    match().counterPivotsThisMatch.value = 7;
    match().unitsSentByPlayer.value = 11;
    match().matchTimeElapsed.value = 42;
    lane().spawn('player', 'marine');
    lane().spawn('ai', 'vulture');
    expect(lane().units.player.value.length).toBe(1);
    expect(lane().units.ai.value.length).toBe(1);

    // 3. Mutate meta-scope state so we can verify it survives.
    meta().maxCounterPivotsAnyMatch.value = 9;
    meta().factionsUnlocked.value = 2;

    // 4. Force match end.
    match().end('player-win');

    // 5. Match-scope refs reset to defaults.
    expect(Number(match().fortressHp.player.value)).toBe(0);
    expect(Number(match().fortressHp.ai.value)).toBe(0);
    expect(match().outcome.value).toBe(null);
    expect(match().counterPivotsThisMatch.value).toBe(0);
    expect(match().unitsSentByPlayer.value).toBe(0);
    expect(match().matchTimeElapsed.value).toBe(0);
    expect(Number(playerIncome.value)).toBe(0);
    expect(Number(aiIncome.value)).toBe(0);
    expect(lane().units.player.value).toEqual([]);
    expect(lane().units.ai.value).toEqual([]);

    // 6. Meta-scope refs survive the match boundary. matchesPlayed
    //    incremented on the 'matchEnded' event; max should hold the value
    //    counterPivotsThisMatch had at end-time (7 > prior 9? No — meta
    //    only updates when payload exceeds prior, so still 9).
    expect(meta().maxCounterPivotsAnyMatch.value).toBe(9);
    expect(meta().factionsUnlocked.value).toBe(2);
    expect(meta().matchesPlayed.value).toBe(1);
  });

  it('matchEnded payload reaches meta before reset clears counter', () => {
    match().start();
    match().counterPivotsThisMatch.value = 5;
    match().end('player-win');

    // meta.maxCounterPivotsAnyMatch should reflect the 5 counter-pivots
    // observed pre-reset, proving the emit-before-reset ordering.
    expect(meta().maxCounterPivotsAnyMatch.value).toBe(5);
  });
});

describe('tug AI opponent (default counter persona)', () => {
  it('produces sends with default persona at default cadence under 60s', async () => {
    const engine = getEngine();
    const playerSequencer = engine.tryInject(SequencerKey.player)!;
    const aiSequencer = engine.tryInject(SequencerKey.ai)!;
    const playerShop = getUnits('player');
    const playerIncome = getIncome('player');

    let playerStarts = 0;
    let aiStarts = 0;
    playerSequencer.on('started', () => {
      playerStarts++;
    });
    aiSequencer.on('started', () => {
      aiStarts++;
    });

    match().start();

    // Drop the player some minerals so they can buy at least once — without
    // a player buy, there's no player sequencer 'started' event to observe,
    // and acceptance asks both sides to fire.
    addResource(playerIncome, 100);
    playerShop.getPurchasable('marine')?.purchase();

    await tick(60 * INTERVAL_RATE); // 60 sim-seconds

    expect(playerStarts).toBeGreaterThan(0);
    expect(aiStarts).toBeGreaterThan(0);
  });
});

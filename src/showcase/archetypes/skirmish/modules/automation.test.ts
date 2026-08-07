import { describe, it, expect, beforeEach } from 'vitest';
import { boot, bootModules, getEngine, tick, tickUntil, TICK_RATE } from '../sim/harness';
import {
  AutomationTiersKey,
  MatchKey,
  TacticalKey,
  createAutomationModule,
  createAutomationTiersModule,
  createMatchModule,
  createTacticalSimModule,
  createTuningModule,
  type MatchApi,
  type TacticalApi,
} from '.';
import { BASE_HP } from '../data/tactical';

/**
 * Bot-vs-bot spec (bone #2 driving bone #3). BOTH sides' shipping policies are
 * installed — "production AI plays itself" — and the tactical sim runs under
 * them to a defeat outcome, closing the win-report seam bone #1 opened.
 */

function match(): MatchApi {
  return getEngine().tryInject(MatchKey)!;
}
function tactical(): TacticalApi {
  return getEngine().tryInject(TacticalKey)!;
}

const MAX_TICKS = 30 * 60 * TICK_RATE; // one full time-limit window, as a cap

describe('skirmish bot-vs-bot', () => {
  beforeEach(() => boot());

  it('accrues supply on both sides while live', async () => {
    match().start();
    await tick(TICK_RATE); // before either side's first spawn cadence
    expect(Number(tactical().supply.a.value)).toBeGreaterThan(0);
    expect(Number(tactical().supply.b.value)).toBeGreaterThan(0);
  });

  it('spawns armies and runs to a defeat outcome', async () => {
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);

    const outcome = match().outcome.value!;
    expect(outcome.reason).toBe('defeat'); // decided by combat, not the clock
    expect(outcome.winner).not.toBeNull();
    expect(match().matchTimeElapsed.value).toBeLessThan(30 * 60);
    const loser = outcome.winner === 'a' ? 'b' : 'a';
    expect(tactical().baseHp[loser].value).toBeLessThanOrEqual(0);
  });

  it('is deterministic — the higher-throughput side (a) wins', async () => {
    // a: all-in, 2s cadence. b: drip-feed, one unit per 6s. a fields the
    // larger army and takes b's base.
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);
    expect(match().outcome.value!.winner).toBe('a');
  });

  it('restores the field for a fresh match on the next start()', async () => {
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);

    match().start(); // matchStarted → sim re-inits
    const t = tactical();
    expect(t.baseHp.a.value).toBe(BASE_HP);
    expect(t.baseHp.b.value).toBe(BASE_HP);
    expect(Number(t.supply.a.value)).toBe(0);
    expect(t.units.a.value).toHaveLength(0);
    expect(t.units.b.value).toHaveLength(0);
    expect(match().inMatch.value).toBe(true);
  });
});

/**
 * The player seat's progression gate. Bot-vs-bot passes no tier, so without
 * this suite the `tier` path would ship unexercised — the shape a player seat
 * lands on, asserted before there is a seat to land it.
 */
describe('skirmish tiered automation seat', () => {
  function bootTiered() {
    return bootModules([
      createTuningModule(),
      createAutomationTiersModule(),
      createMatchModule({
        resetModules: ['skirmish/match/tactical', 'skirmish/match/a/automation'],
      }),
      createTacticalSimModule(),
      // Side `a` is the tiered seat; `b` is absent so nothing else spawns.
      createAutomationModule('a', { cadenceSec: 2, maxSpawnPerBurst: Infinity, tier: 'assisted' }),
    ]);
  }

  beforeEach(() => bootTiered());

  function tiers() {
    return getEngine().tryInject(AutomationTiersKey)!;
  }

  it('starts on the manual tier with the seat locked', () => {
    expect(tiers().currentTierId.value).toBe('manual');
    expect(tiers().hasReached('assisted')).toBe(false);
  });

  it('spawns nothing while its tier is locked, however long the match runs', async () => {
    match().start();
    await tick(20 * TICK_RATE); // ten cadence intervals

    expect(tactical().units.a.value).toHaveLength(0);
    expect(Number(tactical().supply.a.value)).toBeGreaterThan(0); // income still flows
  });

  it('spawns once the tier unlocks mid-match', async () => {
    match().start();
    await tick(20 * TICK_RATE);
    expect(tactical().units.a.value).toHaveLength(0);

    tiers().unlock('assisted');
    await tick(4 * TICK_RATE); // two cadence intervals past the unlock

    expect(tactical().units.a.value.length).toBeGreaterThan(0);
  });

  it('does not bank cadence while locked — the first burst waits a full interval', async () => {
    match().start();
    await tick(20 * TICK_RATE);

    tiers().unlock('assisted');
    await tick(TICK_RATE); // one second, short of the 2s cadence
    expect(tactical().units.a.value).toHaveLength(0);
  });
});

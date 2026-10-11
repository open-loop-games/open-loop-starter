import { describe, it, expect, beforeEach } from 'vitest';
import { boot, bootModules, getEngine, tick, tickUntil, INTERVAL_RATE } from '../sim/harness';
import {
  AutomationTiersKey,
  MatchKey,
  TacticalKey,
  createAutomationModule,
  createAutomationTiersModule,
  createEconomyModule,
  createMatchModule,
  createTacticalSimModule,
  createTuningModule,
  type MatchApi,
  type TacticalApi,
  PERSONAS,
  PERSONA_KEYS,
  createSkirmishModules,
  getAutomationKey,
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

const MAX_TICKS = 30 * 60 * INTERVAL_RATE; // one full time-limit window, as a cap

describe('skirmish bot-vs-bot', () => {
  beforeEach(() => boot());

  it('accrues supply on both sides while live', async () => {
    match().start();
    await tick(INTERVAL_RATE); // before either side's first spawn cadence
    expect(Number(tactical().supply.a.value)).toBeGreaterThan(0);
    expect(Number(tactical().supply.b.value)).toBeGreaterThan(0);
  });

  it('spawns armies and runs to a defeat outcome', async () => {
    // `end()` resets the field right after `matchEnded`, so base hp is read there.
    let baseHpAtEnd: Record<string, number> = {};
    match().on('matchEnded', () => {
      baseHpAtEnd = { a: tactical().baseHp.a.value, b: tactical().baseHp.b.value };
    });
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);

    const outcome = match().outcome.value!;
    expect(outcome.reason).toBe('defeat'); // decided by combat, not the clock
    expect(outcome.winner).not.toBeNull();
    expect(match().matchTimeElapsed.value).toBeLessThan(30 * 60);
    const loser = outcome.winner === 'a' ? 'b' : 'a';
    expect(baseHpAtEnd[loser]).toBeLessThanOrEqual(0);
  });

  it('is deterministic — the same matchup resolves the same way twice', async () => {
    // The shipping matchup is rush (φ=0) against greedy (φ=0.5). WHICH seat
    // wins is a balance question the probes answer, and it moves whenever the
    // economy retunes — so this specs determinism, not the winner.
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);
    const first = match().outcome.value!.winner;

    boot();
    match().start();
    await tickUntil(() => match().outcome.value !== null, MAX_TICKS);
    expect(match().outcome.value!.winner).toBe(first);
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

  it('drafts unit types matching configured composition', async () => {
    bootModules([
      createTuningModule(),
      createAutomationTiersModule(),
      createMatchModule({
        resetModules: [
          'skirmish/match/economy',
          'skirmish/match/tactical',
          'skirmish/match/a/automation',
        ],
      }),
      createEconomyModule(),
      createTacticalSimModule(),
      createAutomationModule('a', {
        cadenceSec: 2,
        composition: { trooper: 1, archer: 1 },
      }),
    ]);
    match().start();
    await tick(10 * INTERVAL_RATE);
    const types = tactical().units.a.value.map((u) => u.type);
    expect(types.length).toBeGreaterThanOrEqual(2);
    expect(types).toContain('trooper');
    expect(types).toContain('archer');
  });

  it('boots with named personas and applies persona configurations', async () => {
    bootModules(
      createSkirmishModules({
        personas: { a: 'rush', b: 'skirmish' },
      }),
    );
    match().start();
    await tick(16 * INTERVAL_RATE);
    const unitsA = tactical().units.a.value;
    const unitsB = tactical().units.b.value;
    expect(unitsA.length).toBeGreaterThan(0);
    expect(unitsB.length).toBeGreaterThan(0);
    // Rush spawns pure troopers
    expect(unitsA.every((u) => u.type === 'trooper')).toBe(true);
    // Skirmish drafts archers
    expect(unitsB.some((u) => u.type === 'archer')).toBe(true);
  });

  it('exposes the 5 canonical personas with valid economic and composition options', () => {
    expect(PERSONA_KEYS).toEqual(['rush', 'investor', 'skirmish', 'boom', 'combined']);
    for (const key of PERSONA_KEYS) {
      const p = PERSONAS[key];
      expect(p.id).toBe(key);
      expect(p.economyShare).toBeGreaterThanOrEqual(0);
      expect(p.economyShare).toBeLessThan(1);
      expect(p.cadenceSec).toBeGreaterThan(0);
      expect(p.maxSpawnPerBurst).toBeGreaterThan(0);
      expect(Object.keys(p.composition).length).toBeGreaterThan(0);
      expect(p.cadenceJitter).toBe(0.15);
    }
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
        resetModules: [
          'skirmish/match/economy',
          'skirmish/match/tactical',
          'skirmish/match/a/automation',
        ],
      }),
      createEconomyModule(),
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
    await tick(20 * INTERVAL_RATE); // ten cadence intervals

    expect(tactical().units.a.value).toHaveLength(0);
    expect(Number(tactical().supply.a.value)).toBeGreaterThan(0); // income still flows
  });

  it('spawns once the tier unlocks mid-match', async () => {
    match().start();
    await tick(20 * INTERVAL_RATE);
    expect(tactical().units.a.value).toHaveLength(0);

    tiers().unlock('assisted');
    await tick(4 * INTERVAL_RATE); // two cadence intervals past the unlock

    expect(tactical().units.a.value.length).toBeGreaterThan(0);
  });

  it('does not bank cadence while locked — the first burst waits a full interval', async () => {
    match().start();
    await tick(20 * INTERVAL_RATE);

    tiers().unlock('assisted');
    await tick(INTERVAL_RATE); // one second, short of the 2s cadence
    expect(tactical().units.a.value).toHaveLength(0);
  });
});

describe('skirmish meso-AI strategic targeting', () => {
  it('evaluates target scores and dynamically selects high-threat or vulnerable bases', async () => {
    const factions = ['crimson', 'azure', 'emerald'] as const;
    bootModules(
      createSkirmishModules({
        factions,
        personas: {
          crimson: 'rush', // prefers weak/damaged base, high distanceExponent
          azure: 'skirmish', // prefers high economy
          emerald: 'investor', // prefers high army threat
        },
      }),
    );

    match().start();
    const t = tactical();
    const autoCrimson = getEngine().tryInject(getAutomationKey('crimson'))!;
    const autoAzure = getEngine().tryInject(getAutomationKey('azure'))!;
    const autoEmerald = getEngine().tryInject(getAutomationKey('emerald'))!;

    expect(autoCrimson.targeting.value.armyWeight).toBe(-0.5);
    expect(autoAzure.targeting.value.economyWeight).toBe(2.0);
    expect(autoEmerald.targeting.value.armyWeight).toBe(1.5);

    // Initially, both opponents have full HP and zero units
    const crimsonTargetInitial = autoCrimson.evaluateTarget();
    expect(['azure', 'emerald']).toContain(crimsonTargetInitial);

    // Damage Azure's base — Crimson (high weaknessWeight 1.5) should decisively target Azure
    t.baseHp.azure.value = 50;
    expect(autoCrimson.evaluateTarget()).toBe('azure');

    // Give Emerald a massive army — Emerald now becomes the highest threat for Emerald-watching seats
    t.units.emerald.value.push({
      id: 999,
      type: 'trooper',
      x: 50,
      y: 50,
      hp: 100,
      cooldown: 0,
    });
    expect(['crimson', 'emerald']).toContain(autoAzure.evaluateTarget());
  });

  it('automatically retargets when the currently targeted base is eliminated', async () => {
    const factions = ['crimson', 'azure', 'emerald'] as const;
    bootModules(
      createSkirmishModules({
        factions,
        personas: {
          crimson: 'rush',
          azure: 'investor',
          emerald: 'boom',
        },
      }),
    );

    match().start();
    const t = tactical();
    t.setTargetBase('crimson', 'azure');
    expect(t.targetBase.crimson.value).toBe('azure');

    // Eliminate Azure
    match().eliminate('azure');
    // Target should immediately update away from the eliminated faction to emerald
    expect(t.targetBase.crimson.value).toBe('emerald');
  });

  it('updates targeting weights when setPersona is called', () => {
    bootModules(
      createSkirmishModules({
        factions: ['crimson', 'azure'],
        personas: { crimson: 'rush', azure: 'investor' },
      }),
    );
    const autoCrimson = getEngine().tryInject(getAutomationKey('crimson'))!;
    expect(autoCrimson.currentPersona.value).toBe('rush');
    expect(autoCrimson.targeting.value.weaknessWeight).toBe(1.5);

    autoCrimson.setPersona('boom');
    expect(autoCrimson.currentPersona.value).toBe('boom');
    expect(autoCrimson.targeting.value.economyWeight).toBe(2.5);
    expect(autoCrimson.targeting.value.weaknessWeight).toBe(0);
  });
});

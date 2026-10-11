import { describe, it, expect, beforeEach } from 'vitest';
import { addResource } from '@open-loop/engine';
import { bootModules, getEngine, tick, INTERVAL_RATE } from '../sim/harness';
import {
  createAutomationTiersModule,
  createAutomationModule,
  createEconomyModule,
  createMatchModule,
  createTacticalSimModule,
  createTuningModule,
  EconomyKey,
  MatchKey,
  TacticalKey,
  type EconomyApi,
  type MatchApi,
  type TacticalApi,
} from '.';
import { ECONOMY_BALANCE } from '../data/economy';

/**
 * The guns-versus-butter split — the archetype's central decision
 * (`../IDENTITY.md` § Rate-function spine). Shape only: that income compounds
 * with workers, that `φ` steers where income goes, and that the two seats
 * diverge because of it. How *far* they diverge is a magnitude the balance
 * probes print, so nothing here asserts a curve.
 */

const MATCH_SCOPE = [
  'skirmish/match/economy',
  'skirmish/match/tactical',
  'skirmish/match/a/automation',
  'skirmish/match/b/automation',
];

/** Economy + sim, no policies — the split is driven by hand. */
function bootBare() {
  bootModules([
    createTuningModule(),
    createMatchModule({ resetModules: MATCH_SCOPE }),
    createEconomyModule(),
    createTacticalSimModule(),
  ]);
}

/** Two seats separated only by `economyShare`, so φ is the sole variable. */
function bootSplit(shareA: number, shareB: number) {
  bootModules([
    createTuningModule(),
    createAutomationTiersModule(),
    createMatchModule({ resetModules: MATCH_SCOPE }),
    createEconomyModule(),
    createTacticalSimModule(),
    createAutomationModule('a', { economyShare: shareA, cadenceSec: 1 }),
    createAutomationModule('b', { economyShare: shareB, cadenceSec: 1 }),
  ]);
}

function economy(): EconomyApi {
  return getEngine().tryInject(EconomyKey)!;
}
function match(): MatchApi {
  return getEngine().tryInject(MatchKey)!;
}
function tactical(): TacticalApi {
  return getEngine().tryInject(TacticalKey)!;
}

/**
 * Play up to `seconds` of the live match, then `read` the field. The match can
 * end by defeat first, and `end()` clears the field with the match-scope reset
 * in that same tick — so a finished match is read at `matchEnded`, which fires
 * before the reset.
 */
async function playFor<T>(seconds: number, read: () => T): Promise<T> {
  let atEnd: { value: T } | undefined;
  const off = match().on('matchEnded', () => {
    atEnd = { value: read() };
  });
  for (let i = 0; i < seconds * INTERVAL_RATE && match().inMatch.value; i++) await tick();
  off();
  return atEnd ? atEnd.value : read();
}

describe('skirmish economy — income and the reinvestment channel', () => {
  beforeEach(() => bootBare());

  it('opens every seat on the same worker count', () => {
    match().start();
    expect(economy().workers.a.value).toBe(ECONOMY_BALANCE.startingWorkers);
    expect(economy().workers.b.value).toBe(ECONOMY_BALANCE.startingWorkers);
  });

  it('accrues income only while a match is live', async () => {
    await tick(5 * INTERVAL_RATE);
    expect(Number(economy().supply.a.value)).toBe(0);

    match().start();
    await tick(5 * INTERVAL_RATE);
    expect(Number(economy().supply.a.value)).toBeGreaterThan(0);
  });

  it('buys a worker when affordable and refuses when not', () => {
    match().start();
    expect(economy().buyWorker('a')).toBe(false); // opens with no banked supply

    addResource(economy().supply.a, ECONOMY_BALANCE.workerCost);
    expect(economy().buyWorker('a')).toBe(true);
    expect(economy().workers.a.value).toBe(ECONOMY_BALANCE.startingWorkers + 1);
  });

  it('compounds — more workers means strictly more income per tick', async () => {
    match().start();
    await tick(INTERVAL_RATE);
    const baseline = Number(economy().supply.a.value);

    // Grant the worker rather than earning it, so the comparison isolates the
    // rate change from the spend that bought it.
    addResource(economy().supply.a, ECONOMY_BALANCE.workerCost);
    economy().buyWorker('a');
    const banked = Number(economy().supply.a.value);
    await tick(INTERVAL_RATE);

    expect(Number(economy().supply.a.value) - banked).toBeGreaterThan(baseline);
  });

  it('counts worker spend against realized share, and army spend against income', () => {
    match().start();
    addResource(economy().supply.a, ECONOMY_BALANCE.workerCost * 2);
    economy().buyWorker('a');
    const afterWorker = economy().economySpend.a.value;
    expect(afterWorker).toBe(ECONOMY_BALANCE.workerCost);

    tactical().spawn('a');
    // Army spend leaves `economySpend` alone — that separation is what makes
    // `realizedShare` mean "share of income invested" rather than "share spent".
    expect(economy().economySpend.a.value).toBe(afterWorker);
  });

  it('caps owned workers', () => {
    match().start();
    addResource(economy().supply.a, ECONOMY_BALANCE.workerCost * (ECONOMY_BALANCE.maxWorkers + 5));
    for (let i = 0; i < ECONOMY_BALANCE.maxWorkers + 5; i++) economy().buyWorker('a');
    expect(economy().workers.a.value).toBe(ECONOMY_BALANCE.maxWorkers);
  });

  it('clears the economy on a fresh match', async () => {
    match().start();
    await tick(10 * INTERVAL_RATE);
    addResource(economy().supply.a, ECONOMY_BALANCE.workerCost);
    economy().buyWorker('a');

    match().start();
    expect(economy().workers.a.value).toBe(ECONOMY_BALANCE.startingWorkers);
    expect(Number(economy().supply.a.value)).toBe(0);
    expect(economy().cumulativeIncome.a.value).toBe(0);
    expect(economy().economySpend.a.value).toBe(0);
  });
});

describe('skirmish economy — φ steers the split', () => {
  it('leaves the economy untouched at φ = 0 and grows it above 0', async () => {
    bootSplit(0, 0.5);
    match().start();
    const workers = await playFor(60, () => ({
      a: economy().workers.a.value,
      b: economy().workers.b.value,
    }));

    expect(workers.a).toBe(ECONOMY_BALANCE.startingWorkers);
    expect(workers.b).toBeGreaterThan(ECONOMY_BALANCE.startingWorkers);
  });

  it('fields army sooner at φ = 0 and out-earns it later at φ > 0', async () => {
    bootSplit(0, 0.5);
    match().start();

    const units = await playFor(10, () => ({
      a: tactical().units.a.value.length,
      b: tactical().units.b.value.length,
    }));
    // The rush is ahead on the field while the greedy seat is still investing.
    expect(units.a).toBeGreaterThan(units.b);

    // …and behind on income once the investment has compounded. Both halves of
    // the tradeoff, in one match — this is the spine's claim in behavioral form.
    const income = await playFor(120, () => ({
      a: ECONOMY_BALANCE.incomePerWorker * economy().workers.a.value,
      b: ECONOMY_BALANCE.incomePerWorker * economy().workers.b.value,
    }));
    expect(income.b).toBeGreaterThan(income.a);
  });

  it('tracks realized share toward the target, overshooting by at most one worker', async () => {
    bootSplit(0, 0.5);
    match().start();
    const split = await playFor(120, () => ({
      a: economy().realizedShare('a'),
      b: economy().realizedShare('b'),
      oneWorkerB: economy().workerCost() / economy().cumulativeIncome.b.value,
    }));

    expect(split.a).toBe(0);
    expect(split.b).toBeGreaterThan(0.4);

    // Buy-while-under-target is bang-bang control against a continuous income
    // stream, so the realized share sits at or just above the target and the
    // overshoot is bounded by one indivisible worker. Asserting that bound
    // rather than a hand-picked ceiling keeps this true as the economy retunes.
    expect(split.b - 0.5).toBeLessThanOrEqual(split.oneWorkerB);
  });
});

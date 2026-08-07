/**
 * Cycler upgrade catalog — wave-model lock (IDENTITY § Balance model; studio/
 * open-loop-starter#21 leaf 3). Pins the permanent catalog on the prestige wallet.
 * Behavioral + shape invariants:
 *   • the wallet is an engine Resource — reach buys auto-deduct Fragments;
 *   • the reach permanent raises L and re-pegs to +0 run length (reach, not pacing);
 *   • the g-bender is reach-gated (locked until permanent power reaches the gate);
 *   • a g-bender level LENGTHENS the run (the sole pace lever bends salvo g toward 1).
 *
 * Runs place the reference board (`placeDefense`); merge() clears the board, so
 * sequences that re-peg rebuild it. Reach L=0 price == quorum (a competent first run
 * banks it). Absolute run-length magnitudes are measured, never authored (multiverse-hr#17).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { boot, cycle, build, prestige, upgrades, placeDefense, tickUntil } from '../sim/harness';
import { PRESTIGE_BALANCE } from '../data/prestige';
import { UPGRADE_BALANCE } from '../data/upgrades';

async function runOnce(): Promise<void> {
  await tickUntil(() => cycle().runState.value === 'ended', 20_000);
}

/** Bank at least `n` Fragments by running (and re-pegging + rebuilding) until the wallet clears it. */
async function bankUntil(n: number): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (prestige().fragments.value.toNumber() >= n) return;
    if (cycle().runState.value === 'ended') prestige().merge();
    placeDefense(); // rebuild the board for the (re-pegged or initial) run
    await runOnce();
  }
  throw new Error(`bankUntil(${n}): wallet never reached target`);
}

describe('upgrades — the reach permanent (freely sold; reach, not pacing)', () => {
  beforeEach(() => boot());

  it('costs quorum·ratio^L and is affordable after a competent first run', async () => {
    const u = upgrades();
    placeDefense();
    await runOnce();
    // L=0 price == quorum (the first competent run banks exactly it).
    expect(new Decimal(u.reach.getCost()).toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum);
    expect(u.reach.canPurchase.value).toBe(true);
  });

  it('buying reach raises L, auto-deducts Fragments (the Resource), and re-pegs to +0 run length', async () => {
    const b = build();
    const u = upgrades();
    const c = cycle();
    placeDefense();
    await runOnce();
    const base = c.endedAtMinutes.value!;
    const before = prestige().fragments.value.toNumber();
    const cost = new Decimal(u.reach.getCost()).toNumber();

    u.reach.purchase();

    expect(b.powerLevel.value).toBe(1); // reach drives build's L
    expect(prestige().fragments.value.toNumber()).toBe(before - cost); // auto-deducted
    expect(new Decimal(u.reach.getCost()).toNumber()).toBe(
      PRESTIGE_BALANCE.mergeQuorum * UPGRADE_BALANCE.powerUpgradeCostRatio,
    ); // next level costs quorum·ratio^1

    prestige().merge();
    placeDefense(); // Redeploy rebuilds
    await runOnce();
    expect(Math.abs(c.endedAtMinutes.value! - base)).toBeLessThan(0.1); // +0 under the peg
  });
});

describe('upgrades — the g-bender (the sole pace lever, reach-gated)', () => {
  beforeEach(() => boot());

  it('is reach-gated: locked on power level, not on Fragments', async () => {
    const u = upgrades();
    const b = build();
    // Bank past the level-1 cost while power stays at 0 → the gate (L≥2) blocks it.
    await bankUntil(UPGRADE_BALANCE.gBendBaseCost + 2);
    expect(b.powerLevel.value).toBe(0);
    expect(u.gBender.canPurchase.value).toBe(false); // gated on reach, not affordability

    b.raisePower();
    b.raisePower(); // L=2 clears the level-1 gate
    expect(u.gBender.canPurchase.value).toBe(true);
  });

  it('a bought level lengthens the run (never touching reach)', async () => {
    const b = build();
    const u = upgrades();
    const c = cycle();
    b.raisePower();
    b.raisePower(); // L=2, passes the level-1 gate; reach held fixed hereafter
    await bankUntil(UPGRADE_BALANCE.gBendBaseCost);

    // Baseline run at bend level 0.
    if (c.runState.value === 'ended') prestige().merge();
    placeDefense();
    await runOnce();
    const base = c.endedAtMinutes.value!;

    // Buy one bend level, re-peg, and the next run lengthens (shallower salvo g).
    expect(u.gBender.canPurchase.value).toBe(true);
    u.gBender.purchase();
    expect(u.gBendLevel.value).toBe(1);
    prestige().merge();
    placeDefense();
    await runOnce();
    const bent = c.endedAtMinutes.value!;

    expect(bent).toBeGreaterThan(base); // the sole pace lever lengthened the run
    expect(b.powerLevel.value).toBe(2); // reach untouched — pacing moved, not power
  });
});

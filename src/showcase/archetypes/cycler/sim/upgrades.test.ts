/**
 * Cycler upgrade catalog — Lane-4 lock (IDENTITY § Balance model, lane 4).
 *
 * Pins what `balance/upgrade-probe.ts` MEASURED against the real assembled stack:
 * the permanent catalog on the prestige wallet. Behavioral + shape invariants:
 *   • the wallet is an engine Resource — reach buys auto-deduct Fragments;
 *   • the reach permanent raises L and re-pegs to +0 run length (reach, not pacing);
 *   • the g-bender is reach-gated (locked until permanent power reaches the gate);
 *   • a g-bender level LENGTHENS the run to the closed form (the sole pace lever).
 *
 * Provenance (2026-07, shipped constants H=4, g=2, T_g=6, τ_setup=4; quorum=3,
 * powerUpgradeCostRatio=2; gBendRatio=0.7, gBendBaseCost=6, gBendGateStep=2):
 * reach L=0 price == quorum; g-bender level 1 → g_eff=1.70 → N* ≈ 19.67m.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { boot, cycle, build, prestige, upgrades, tickUntil } from './harness';
import { THREAT_BALANCE } from '../data/threat';
import { PRESTIGE_BALANCE } from '../data/prestige';
import { UPGRADE_BALANCE } from '../data/upgrades';

async function runOnce(): Promise<void> {
  await tickUntil(() => cycle().runState.value === 'ended');
}

/** Bank at least `n` Fragments by running (and re-pegging) until the wallet clears it. */
async function bankUntil(n: number): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (prestige().fragments.value.toNumber() >= n) return;
    if (cycle().runState.value === 'ended') prestige().merge();
    await runOnce();
  }
  throw new Error(`bankUntil(${n}): wallet never reached target`);
}

/** N*(L_bend) closed form under the shared peg — the projection's Lane-1 oracle. */
function predictRunLength(gBendLevel: number): number {
  const {
    headroom: H,
    escalationBase: g,
    escalationTimescale: Tg,
    setupGrace: setup,
  } = THREAT_BALANCE;
  const gEff = 1 + (g - 1) * Math.pow(UPGRADE_BALANCE.gBendRatio, gBendLevel);
  return setup + Tg * (Math.log(H) / Math.log(gEff));
}

describe('upgrades — the reach permanent (freely sold; reach, not pacing)', () => {
  beforeEach(() => boot());

  it('costs quorum·ratio^L and is affordable after a competent first run', async () => {
    const u = upgrades();
    await runOnce();
    // L=0 price == quorum (the first competent run banks exactly it), and the
    // geometric ratio is powerUpgradeCostRatio (data/upgrades.ts).
    expect(new Decimal(u.reach.getCost()).toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum);
    expect(u.reach.canPurchase.value).toBe(true);
  });

  it('buying reach raises L, auto-deducts Fragments (the Resource), and re-pegs to +0 run length', async () => {
    const b = build();
    const u = upgrades();
    const c = cycle();
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
    await runOnce();
    expect(Math.abs(c.endedAtMinutes.value! - base)).toBeLessThan(0.05); // +0 under the peg
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

  it('a bought level lengthens the run to the closed form (never touching reach)', async () => {
    const b = build();
    const u = upgrades();
    const c = cycle();
    b.raisePower();
    b.raisePower(); // L=2, passes the level-1 gate; reach held fixed hereafter
    await bankUntil(UPGRADE_BALANCE.gBendBaseCost);

    // Baseline run at bend level 0.
    if (c.runState.value === 'ended') prestige().merge();
    await runOnce();
    const base = c.endedAtMinutes.value!;
    expect(base).toBeCloseTo(predictRunLength(0), 1); // ~16m

    // Buy one bend level, re-peg, and the next run lengthens to N*(1).
    expect(u.gBender.canPurchase.value).toBe(true);
    u.gBender.purchase();
    expect(u.gBendLevel.value).toBe(1);
    prestige().merge();
    await runOnce();
    const bent = c.endedAtMinutes.value!;

    expect(bent).toBeGreaterThan(base); // the sole pace lever lengthened the run
    expect(b.powerLevel.value).toBe(2); // reach untouched — pacing moved, not power
    expect(Math.abs(bent - predictRunLength(1))).toBeLessThan(0.2); // matches the closed form (≤ ~1 dt)
  });
});

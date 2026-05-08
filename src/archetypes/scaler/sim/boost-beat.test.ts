/**
 * Regression locks for the Scaler Accelerator Boost action — direct API exercise
 * (not a sim run). Asserts the side-effect cluster of `boostAccelerator()`:
 *
 *   1. prestigePoints zero post-buy (canonical destructive spend overrides
 *      prestige reset's `keep: [prestigePoints]` exemption per `Buy.ts:734`).
 *   2. acceleratorBoostBought increments by 1.
 *   3. acceleratorBoostCost grows super-exponentially (`Buy.ts:715-716`:
 *      `cost ×= 1e10 × 10^bought`, so 1e3 → 1e3 × 1e10 × 10 = 1e14).
 *   4. Prestige reset fires: coin tier zeros, prestige producer counts zero,
 *      coins return to the module's default starting kit (100).
 *   5. Coin rateChain still carries the "Accelerator Boost" binding (install-
 *      time permanent — survives the reset).
 *
 * Sim-driven boost ratcheting (auto-boost gates on prestigeUnlocked, fires
 * when PP ≥ cost) lives implicitly in the transcend-beat run; this test
 * locks the action's invariants in isolation so a regression in the cost
 * formula or reset wiring surfaces here, not 290 sim minutes downstream.
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'open-loop-engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  boostAccelerator,
  getAcceleratorBoostBought,
  getAcceleratorBoostCost,
  getCoinProducers,
  getCoinResource,
  getPrestigePoints,
} from '../modules';

describe('scaler accelerator-boost action — buy side effects', () => {
  it('zeros PP, increments bought, scales cost, fires prestige reset', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `boost-beat-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const pp = getPrestigePoints();
    const bought = getAcceleratorBoostBought();
    const cost = getAcceleratorBoostCost();
    const coins = getCoinResource();
    const coin1 = getCoinProducers().getProducer('coin-1')!;

    // Stage prestige scope: PP at the boost cost, coins above the module
    // default so the reset's coins-back-to-100 write is observable.
    pp.value = 1e3;
    coins.value = 1e6;

    expect(bought.value).toBe(0);
    expect(Decimal.eq(cost.value, 1e3)).toBe(true);

    const result = boostAccelerator();
    expect(result).toBe(true);

    // ─── PP destructive spend ─────────────────────────────────────────
    expect(Decimal.eq(pp.value, 0)).toBe(true);

    // ─── Counter ratchets ─────────────────────────────────────────────
    expect(bought.value).toBe(1);

    // ─── Cost super-exponential growth ────────────────────────────────
    // Canonical: cost ×= 1e10 × 10^bought; with starting 1e3 and bought=1
    // post-increment, new cost = 1e3 × 1e10 × 10 = 1e14.
    expect(Decimal.eq(cost.value, 1e14)).toBe(true);

    // ─── Prestige reset fired: coin tier zeroed ───────────────────────
    // `prestigeReset.reset()` walks `['scaler-coin', 'scaler-prestige']`,
    // so the coin module's persistent refs reset to defaults — coins back
    // to the 100 starting kit, and the still-zero coin-1 owned count holds.
    expect(Decimal.eq(coins.value, 100)).toBe(true);
    expect(Decimal.eq(coin1.ownedCount.value, 0)).toBe(true);

    // ─── Boost binding survives reset ─────────────────────────────────
    // chain.bind happens at install time; the reset doesn't unbind. The
    // binding's multiplier closure now reads bought=1, contributing
    // acceleratorPower^5 ≈ 1.61 to coin rateChain.
    const bindingIds = coin1.rateChain.bindings().map((b) => b.id);
    expect(bindingIds.some((id) => id.includes('Accelerator Boost'))).toBe(true);

    engine.dispose();
  });

  it('refuses when PP below cost', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `boost-refuse-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const pp = getPrestigePoints();
    const bought = getAcceleratorBoostBought();
    const cost = getAcceleratorBoostCost();

    pp.value = 999; // one short of the 1e3 baseline cost

    const result = boostAccelerator();
    expect(result).toBe(false);
    expect(bought.value).toBe(0);
    expect(Decimal.eq(cost.value, 1e3)).toBe(true);
    expect(Decimal.eq(pp.value, 999)).toBe(true);

    engine.dispose();
  });
});

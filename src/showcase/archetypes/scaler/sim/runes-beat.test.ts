/**
 * Regression locks for the Scaler runes beat — first sacrifice raises the
 * Speed rune visibly into the coin rateChain.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock chosen numbers with
 * `toBeBetween` bounds; discovery happens elsewhere (`balance/solve-probe.ts`,
 * run via `pnpm exec vite-node`).
 *
 * Predictor (`balance/spec.ts predictFirstSpeedLevel1Sec`) returns the
 * first-prestige time exactly — the autobuyer's onTick sacrifice fires the
 * same engine tick the prestige reset's afterReset accrues offerings, and
 * 2 offerings clear Speed's level-1 threshold (≈0.77 EXP) in one pass.
 *
 * Verify-driver (`balance/verify-probe.ts`) tracks both first-prestige and
 * first-Speed-level-1 times and diffs with one-tick tolerance.
 *
 * State invariants pinned: Speed leaves level 0, Speed mAcc multiplier
 * surfaces in coin chain, all three first-arc-active rune bindings
 * register against coin-1's rateChain.
 */

import { describe, it, expect } from 'vitest';
import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinProducers,
  getOfferings,
  getPrestigePoints,
  getRuneEffects,
  getRuneLevel,
} from '../modules';

const TICK_DELTA = 1; // 1s — same scale as prestige-beat lock; minute-scale events.
const FIRE_TIME_CEILING = 90 * 60; // 90 min ceiling — well above the 58 min closure.

describe('scaler runes-beat lock — beat-3 (first sacrifice raises Speed)', () => {
  it('fires within bounds: Speed leaves 0 same tick as first prestige', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `runes-beat-lock-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const pp = getPrestigePoints();
    const offerings = getOfferings();
    const speedLv = getRuneLevel('speed');
    const speedFx = getRuneEffects('speed');

    let firstPrestigeAt = -1;
    const result = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: FIRE_TIME_CEILING,
      until: ({ simTime }) => {
        if (firstPrestigeAt < 0 && Decimal.gt(pp.cumulative?.value ?? 0, 0)) {
          firstPrestigeAt = simTime;
        }
        return firstPrestigeAt >= 0 && speedLv.value >= 1;
      },
    });

    expect(result.terminated).toBe('predicate');

    // ─── Predictor lock: Speed level-1 fires on the first-prestige tick ──
    // `balance/spec.ts predictFirstSpeedLevel1Sec` returns firstPrestigeAt
    // exactly. The deterministic tick co-location is what the regression
    // catches — drift means an engine-side primitive (autobuyer ordering,
    // afterReset hook, computeEXPToLevel) has shifted.
    expect(result.elapsedSimulated - firstPrestigeAt).toBeLessThanOrEqual(TICK_DELTA);
    expect(result.elapsedSimulated).toBeGreaterThan(50 * 60);
    expect(result.elapsedSimulated).toBeLessThan(75 * 60);

    // ─── Beat-3 state invariants ──────────────────────────────────────
    // Speed left level 0 — discovery yields level 2 (2 offerings → 2 EXP →
    // floor(150 × log10(1.04)) = 2). Bounded loose to tolerate any drift in
    // the offeringBaseGain × levelFromEXP path.
    expect(speedLv.value).toBeGreaterThanOrEqual(1);
    expect(speedLv.value).toBeLessThan(50);

    // ─── Speed mAcc multiplier observable ─────────────────────────────
    // Closure: 1.005 at level 2. The first-arc-active binding "Rune: Speed
    // (mAcc)" feeds into coin producers' rateChains; mAcc > 1 means the
    // grant is live and the closure-gate beat is reached.
    expect(speedFx.value.multiplicativeAccelerators).toBeGreaterThan(1);
    expect(speedFx.value.multiplicativeAccelerators).toBeLessThan(2);

    // ─── Offerings drained by auto-sacrifice ──────────────────────────
    // Auto-sacrifice consumes the entire offerings pool same tick into the
    // lowest-level rune. Sub-1 here means everything was spent (at first
    // arc 1 EXP per offering, no fractional residue).
    expect(Decimal.lt(offerings.value, 1)).toBe(true);

    // ─── Rune chain bindings registered against coin-1 rateChain ──────
    // Confirms first-arc-active rune effects routed through chain.bind with
    // their named attribution — these surface in producer-row tooltips.
    const coin1 = getCoinProducers().getProducer('coin-1');
    expect(coin1).toBeDefined();
    const bindingIds = coin1!.rateChain.bindings().map((b) => b.id);
    expect(bindingIds.some((id) => id.includes('Rune: Speed (mAcc)'))).toBe(true);
    expect(bindingIds.some((id) => id.includes('Rune: Duplication (mMult)'))).toBe(true);
    expect(bindingIds.some((id) => id.includes('Rune: Prism (10^prod)'))).toBe(true);

    engine.dispose();
  });
});

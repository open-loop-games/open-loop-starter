/**
 * Regression locks for the Scaler runes beat — first sacrifice raises the
 * Speed rune visibly into the coin rateChain.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock chosen numbers with
 * `toBeBetween` bounds; discovery happens elsewhere (`balance/runes-beat.ts`,
 * run via `pnpm exec vite-node`). The bounds below come from a converged
 * discovery run against the default `SCALER_BALANCE` constants.
 *
 * Discovery snapshot (2026-05-07, runes leaf 4 land):
 *   first prestige fires at simTime ≈ 3499s (58.3 min) — unchanged from leaf 3
 *   on first prestige's afterReset: offerings += offeringBaseGain × SI.mult
 *     (= 2 × 1 = 2 at first prestige, since SI level is 0)
 *   auto-sacrifice consumes offerings same tick → Speed reaches level 2
 *     (2 EXP at costCoefficient 50 / levelsPerOOM 150 → floor(150 × log10(1.04)) = 2)
 *   Speed.multiplicativeAccelerators at level 2 ≈ 1.005 (1 + 2/400) — the
 *     "Rune: Speed (mAcc)" entry on the coin rateChain is now > 1
 *
 * Invariants pinned: rune-arc beat fires within the prestige-beat window,
 * Speed leaves level 0, Speed mAcc multiplier surfaces in coin chain, all
 * three first-arc-active rune bindings register against coin-1's rateChain.
 */

import { describe, it, expect } from 'vitest';
import { Decimal, runUntil } from 'open-loop-engine';
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

    const result = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: FIRE_TIME_CEILING,
      until: () => {
        const prestiged = Decimal.gt(pp.cumulative?.value ?? 0, 0);
        const speedRose = speedLv.value >= 1;
        return prestiged && speedRose;
      },
    });

    expect(result.terminated).toBe('predicate');

    // ─── Beat-3 fire-time band ────────────────────────────────────────
    // Closure: 3499s (auto-sacrifice fires the same tick as first prestige's
    // afterReset). Bounds match the prestige-beat window since the rune-arc
    // beat is co-located with first prestige under the default constants —
    // shifts only if first prestige itself shifts.
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

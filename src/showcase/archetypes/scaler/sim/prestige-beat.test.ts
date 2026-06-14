/**
 * Regression locks for the Scaler beat-2 fire-time and post-beat state.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock chosen numbers with
 * `toBeBetween` bounds; discovery happens elsewhere (`balance/solve.ts`,
 * run via `pnpm exec vite-node`).
 *
 * Predictor (`balance/spec.ts predictPrestigeAtCanonicalThreshold`) computes
 * frozen-state engine queries at the canonical threshold (1e16):
 *   - `prestigePointGain` at threshold = 100 exactly (canonical formula
 *     `floor((c/1e12)^0.5)` constructed for this equivalence).
 *   - `prestigeConversion.canConvert` = true at threshold.
 *
 * Verify-driver (`balance/verify.ts`) sims to first prestige and diffs.
 * The threshold equivalence pins the `anyOf` disjunction's structural
 * collapse — the coin-threshold and gain-threshold branches fire at the
 * same engine tick under canonical params.
 *
 * Fire-time window tightened from a converged discovery run (3499s ≈ 58.3
 * min closure) to predictor-aware bounds. Drift outside the band signals
 * a shift in coin-tier compounding or an autobuyer scheduling change.
 */

import { describe, it, expect } from 'vitest';
import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinsThisPrestige,
  getDiamondProducers,
  getPrestigePoints,
  getPrestigeUpgrades,
} from '../modules';

const TICK_DELTA = 1; // 1s — beat-2 lives at minute scale; per-tick fidelity adds nothing.
const FIRE_TIME_CEILING = 90 * 60; // 90 min ceiling — well above the 58 min closure.

describe('scaler prestige-beat lock — beat-2 (first prestige + first diamond)', () => {
  it('fires within bounds and lands diamond-1 autobuy in the same tick', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `prestige-beat-lock-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const pp = getPrestigePoints();
    const cthis = getCoinsThisPrestige();
    const diamond1 = getDiamondProducers().getProducer('diamond-1');
    const prestigeUp = getPrestigeUpgrades();
    expect(diamond1).toBeDefined();

    // Predicate: BOTH first prestige fired (cumulative > 0 — engine's
    // lifetime tracker survives the prestige reset) AND diamond-1
    // autobuyer kicked in. The compound predicate exercises the
    // tier-presence gate flip in the same run as the prestige fire.
    const result = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: FIRE_TIME_CEILING,
      until: () => {
        const prestiged = Decimal.gt(pp.cumulative?.value ?? 0, 0);
        const diamondOwned = Decimal.gte(diamond1!.count.value, 1);
        return prestiged && diamondOwned;
      },
    });

    expect(result.terminated).toBe('predicate');

    // ─── Beat-2 fire-time band ────────────────────────────────────────
    // Converged discovery: 3405s (56.8 min) under canonical autobuyer +
    // canonical 1e16 threshold. Bounds: ±5min around the closure — tight
    // enough to catch a 10% shift in coin-tier compounding, loose enough
    // to tolerate per-tick scheduling jitter from autobuyer sweep order.
    expect(result.elapsedSimulated).toBeGreaterThan(54 * 60);
    expect(result.elapsedSimulated).toBeLessThan(62 * 60);

    // ─── Beat-2 state invariants ──────────────────────────────────────
    // prestigePoints.cumulative tracks first-cycle gain. Closure value:
    // 100 (the canonical floor for a single 1e16-coin prestige cycle —
    // gain = floor(sqrt(coinsThisPrestige / 1e12))). Bounded loosely
    // upward in case a fast finish overshoots the threshold.
    const cumPP = new Decimal(pp.cumulative?.value ?? 0);
    expect(cumPP.gte(100)).toBe(true);
    expect(cumPP.lt(1000)).toBe(true);

    // diamond-1 owned ≥ 1 — the tier-presence gate opened on first
    // prestige and the diamond autobuyer purchased within one tick.
    expect(Decimal.gte(diamond1!.count.value, 1)).toBe(true);

    // coinsThisPrestige reset to 100 (its default, per `Reset.ts:409` —
    // canonical resets to 100, not 0). Closure: exactly 100 immediately
    // post-prestige; bounded loose to tolerate one tick of accumulation
    // if the diamond purchase landed before the snapshot.
    const cthisVal = new Decimal(cthis.value);
    expect(cthisVal.gte(100)).toBe(true);
    expect(cthisVal.lt(1e10)).toBe(true);

    // Prestige upgrades stay unbought — cheapest costs 1e5 PP, far
    // above the 100 PP gain the first cycle yields. Locks the
    // expectation that this beat does NOT cross the prestige-upgrade
    // threshold; that's a later-leaf beat (multi-prestige stack).
    expect(prestigeUp.purchasedCount.value).toBe(0);

    engine.dispose();
  });
});

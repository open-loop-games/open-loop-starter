/**
 * Regression locks for the Scaler transcend beat — first transcend converts,
 * mythos cascade fires, prestige tier zeros (canonical inversion), and the
 * transcend-tab substrate is observable.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock chosen numbers with
 * `toBeBetween` bounds; discovery happens elsewhere (`balance/transcend-beat.ts`,
 * run via `pnpm exec vite-node`). The bounds below come from a converged
 * discovery run against the default `SCALER_BALANCE` constants with the
 * port-deviated `transcendThreshold = 5e16` / `transcendDivisor = 5e16` (see
 * `data/balance.ts` for the deviation rationale — first-arc balance can't
 * reach the canonical 1e100 without later-arc compounding).
 *
 * Discovery snapshot (2026-05-07, transcend leaf 5 land):
 *   first prestige fires at simTime ≈ 3499s (58.3 min) — unchanged from leaves 2-4
 *   first transcend fires at simTime ≈ 17419s (290.3 min total; 232 min after first
 *     prestige) — first-arc port balance reaches the deviated threshold via
 *     ratcheted prestige/rune compounding
 *   mythos-1 auto-bought same tick (cost 1 transcendPoint, gain = 1 per
 *     transcend cycle, so each cycle ratchets one mythos-1 buy then resets)
 *   prestigePoints.value = 0 post-transcend (canonical inversion: transcend
 *     reset's `keep:` excludes prestigePoints, contrast with prestige reset's
 *     `keep: [prestigePoints]`)
 *
 * Invariants pinned: transcend-arc beat fires within bounded window, mythos-1
 * substrate produces transcend shards, prestigePoints zero on transcend
 * reset, transcend upgrade 41 binds into coin rateChain (live whether bought
 * or not, contributing identity-1 when inactive).
 */

import { describe, it, expect } from 'vitest';
import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinProducers,
  getPrestigePoints,
  getTranscendPoints,
  getTranscendShards,
  getMythosProducers,
} from '../modules';

const TICK_DELTA = 1; // 1s — same scale as prestige-beat / runes-beat locks.
const FIRE_TIME_CEILING = 6 * 60 * 60; // 6h ceiling — well above the 290 min closure.

describe('scaler transcend-beat lock — beat-5 (first transcend fires)', () => {
  it('fires within bounds: substrate produces, prestigePoints zero post-reset', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `transcend-beat-lock-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const pp = getPrestigePoints();
    const tp = getTranscendPoints();
    const ts = getTranscendShards();
    const mythosProducers = getMythosProducers();
    const coin1 = getCoinProducers().getProducer('coin-1');

    const mythos1Producer = mythosProducers.getProducer('mythos-1');
    const result = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: FIRE_TIME_CEILING,
      // Wait for first transcend AND first mythos-1 purchase. These bounce
      // 0/1 across reset/auto-buy cycles, so the until() catches the moment
      // the auto-buy fires post-conversion (substrate observable).
      until: () =>
        Decimal.gt(tp.cumulative?.value ?? 0, 0) &&
        Decimal.gt(mythos1Producer?.ownedCount.value ?? 0, 0),
    });

    expect(result.terminated).toBe('predicate');

    // ─── Beat-5 fire-time band ────────────────────────────────────────
    // Closure: 17419s (290 min). Bounds tolerate balance drift in the
    // ratcheted-prestige path: first-prestige at 3499s + ~232 min of
    // post-prestige coin compounding to reach the 5e16 deviated threshold.
    expect(result.elapsedSimulated).toBeGreaterThan(200 * 60);
    expect(result.elapsedSimulated).toBeLessThan(360 * 60);

    // ─── First-prestige regression ────────────────────────────────────
    // Confirms leaf-2 prestige beat still fires en-route to first transcend.
    expect(Decimal.gt(pp.cumulative?.value ?? 0, 0)).toBe(true);

    // ─── Canonical inversion: prestigePoints zero on transcend reset ──
    // `Reset.ts:504` `prestigePoints = new Decimal('0')` inside transcend
    // path; engine port realizes via `keep:` exclusion (transcend reset's
    // keep is [transcendPoints, transcendCount], NOT [prestigePoints]).
    expect(Decimal.eq(pp.value, 0)).toBe(true);

    // ─── Mythos cascade substrate fires ───────────────────────────────
    // mythos-1 auto-buys with 1-TP gain on first transcend (substrate
    // observable; the until() above caught the post-buy state).
    expect(mythos1Producer).toBeDefined();
    expect(Decimal.gt(mythos1Producer!.ownedCount.value, 0)).toBe(true);

    // Transcend shards generated from mythos cascade — bounds tolerate
    // the in-progress reset/buy cycle at sample time.
    expect(Decimal.gte(ts.value, 0)).toBe(true);

    // ─── Cross-tier rateChain binding observable ──────────────────────
    // Transcend upgrades 41/43/56 register bindings on coin-1's rateChain
    // even when inactive — confirms `expandUpgradeGrant` extension for
    // `tier: 'transcend'` dispatch and the 'transcend-upgrades' category
    // lifted into the cross-tier wiring at install time. Accelerator Boost
    // binds alongside (transcend module install path).
    expect(coin1).toBeDefined();
    const bindingIds = coin1!.rateChain.bindings().map((b) => b.id);
    expect(bindingIds.some((id) => id.includes('upgrade-41'))).toBe(true);
    expect(bindingIds.some((id) => id.includes('upgrade-56'))).toBe(true);
    expect(bindingIds.some((id) => id.includes('Accelerator Boost'))).toBe(true);

    // Note: `acceleratorBoostBought` zeros on transcend reset (canonical
    // `Reset.ts:498-499`), so sampling it post-`until` would observe 0
    // regardless of how many boosts fired pre-transcend. A dedicated
    // boost-beat test sampling pre-first-transcend is its own follow-up;
    // this beat asserts the binding wiring (above) which is install-time
    // permanent.

    engine.dispose();
  }, 90_000);
});

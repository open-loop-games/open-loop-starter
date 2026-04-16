/**
 * Idle-loops convergence + monotonicity (OL-445 test 3/3).
 *
 * Single long `runHeadless` call with enough ticks to contain many
 * loop restarts. A `ConvergenceAnalyzer` hooks `onLoopFinalize` via
 * `bindLoopAnalyzers`, recording `bestOf.entries['str-xp'].value` per
 * completed loop.
 *
 * This is the main dogfooding test for the loop-runner stack. If any
 * wire breaks — BestOf not advancing, applySnapshot no-op, captureStrategy
 * returning stale snapshots, mutation cleanup skipped — the monotonicity
 * or advancement-rate assertion fails loudly. Bug-injection validation
 * (OL-445 acceptance) targets this file.
 *
 * Two scenarios:
 *   - Tier 2 (Optimizer): earnedCount ≥ 3, autoApply on, BestReplay only.
 *     Deterministic: every restart replays the same best-of snapshot,
 *     so the best-of value is monotonically non-decreasing with zero
 *     regressions.
 *   - Tier 3a (MutateBest blind): earnedCount ≥ 5. Mutations are
 *     measured over a two-loop cadence; single evaluate restarts can
 *     regress when a mutation is worse than baseline, but the revert
 *     path must keep the best-of itself non-regressing (BestOf is
 *     absolute-mode and only accepts improvements).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decimal, runHeadless, bindLoopAnalyzers } from 'open-loop-engine';
import { seedQueue as SEED_QUEUE_IDS } from '@/modules/mods/idle-loops/content';
import {
  bootIL,
  pumpAchievements,
  withSeededMathRandom,
  createConvergenceAnalyzer,
  maxConsecutiveRegressions,
  type ILBoot,
} from './idle-loops-harness-helpers';

const TICKS = 4000;
const TICK_DELTA = 0.05; // 20 TPS → 200 simulated seconds

describe('idle-loops convergence — Tier 2 Optimizer', () => {
  let boot: ILBoot;

  beforeEach(async () => {
    boot = bootIL();
    // Prime: run two loops so BestOf captures a baseline str-xp entry
    // and the recommendation system has something to replay.
    await boot.handle.tickUntil(
      () => new Decimal(boot.state.loop.count.value).toNumber() >= 2,
      200_000,
    );
    pumpAchievements(boot.state, 3); // Optimizer tier threshold
    await boot.handle.tick(1);
    expect(boot.state.achievements.earnedCount.value).toBeGreaterThanOrEqual(3);
    // Stop the handle's timer — runHeadless drives the engine manually
    // via simulateTick so the timer-driven tick loop would double-count.
    boot.handle.dispose();
  });

  afterEach(() => {
    boot.handle.dispose();
  });

  it('best-of str-xp is monotonically non-decreasing across many restarts', async () => {
    await withSeededMathRandom(201, async () => {
      const analyzer = createConvergenceAnalyzer(boot.state.bestOf, 'str-xp');
      runHeadless({
        setup: () => {
          const analyzers = [analyzer];
          bindLoopAnalyzers(boot.state.loopLog, analyzers);
          return analyzers;
        },
        tick: (dt) => boot.handle.engine.loop.simulateTick(dt),
        ticks: TICKS,
        tickDelta: TICK_DELTA,
        seed: 42,
      });

      expect(analyzer.samples.length).toBeGreaterThanOrEqual(5);
      // Optimizer replays the best snapshot deterministically — zero
      // regressions tolerated.
      expect(maxConsecutiveRegressions(analyzer.samples)).toBe(0);
      // BestOf's captured snapshot must be non-empty — otherwise the
      // autoApply path replays an empty queue and actions stop firing.
      // Catches the captureStrategy-returns-[] bug injection.
      const bestEntry = boot.state.bestOf.entries.value['str-xp'];
      expect(bestEntry).toBeTruthy();
      const snapshot = bestEntry!.strategySnapshot as Array<{ id: string }> | null;
      expect(Array.isArray(snapshot)).toBe(true);
      expect(snapshot!.length).toBeGreaterThan(0);
      // Queue must not have been wiped — autoApply is on, so an empty
      // applySnapshot would have left the queue empty after restart.
      // Catches the applySnapshot-no-op bug injection.
      expect(boot.state.queue.items.value.length).toBeGreaterThan(0);
    });
  });
});

describe('idle-loops convergence — Tier 3a MutateBest', () => {
  let boot: ILBoot;

  beforeEach(async () => {
    boot = bootIL();
    await boot.handle.tickUntil(
      () => new Decimal(boot.state.loop.count.value).toNumber() >= 2,
      200_000,
    );
    pumpAchievements(boot.state, 5); // MutateBest blind threshold
    await boot.handle.tick(1);
    expect(boot.state.achievements.earnedCount.value).toBeGreaterThanOrEqual(5);
    boot.handle.dispose();
  });

  afterEach(() => {
    boot.handle.dispose();
  });

  it('best-of str-xp stays non-decreasing even while mutations are evaluated', async () => {
    await withSeededMathRandom(202, async () => {
      const analyzer = createConvergenceAnalyzer(boot.state.bestOf, 'str-xp');
      runHeadless({
        setup: () => {
          const analyzers = [analyzer];
          bindLoopAnalyzers(boot.state.loopLog, analyzers);
          return analyzers;
        },
        tick: (dt) => boot.handle.engine.loop.simulateTick(dt),
        ticks: TICKS,
        tickDelta: TICK_DELTA,
        seed: 43,
      });

      expect(analyzer.samples.length).toBeGreaterThanOrEqual(5);
      // BestOf in absolute mode only accepts improvements — the tracked
      // `best.value` per finalize must be non-decreasing regardless of
      // which queue the strategy installed. A regression here means
      // BestOf.submit() accepted a worse value, which is a core engine
      // contract break.
      expect(maxConsecutiveRegressions(analyzer.samples)).toBe(0);
      // MutateBest proposes random queue mutations every restart. Over
      // several thousand ticks the live queue should have diverged from
      // the seed queue at least once — if it hasn't, applySnapshot
      // never installed a proposed mutation. Catches the applySnapshot-
      // no-op bug injection.
      const finalIds = boot.state.queue.items.value.map((i) => i.id).join(',');
      const seedIds = SEED_QUEUE_IDS.join(',');
      expect(finalIds).not.toBe(seedIds);
    });
  });

  it('seeded re-run produces identical sample-value sequence', async () => {
    // Determinism check: booting fresh, pumping identically, patching
    // Math.random with the same seed, and running the same ticks should
    // produce the same per-finalize best-of values. Without a seeded
    // RNG, MutateBest picks different mutations each run and the
    // sample values diverge.
    //
    // Compares the common prefix of the two runs' samples. Exact length
    // can differ by one loop when priming (which runs outside the
    // seeded block) lands on different tick boundaries — that drift is
    // orthogonal to the determinism property we care about.
    const snapshotA: number[] = [];
    const snapshotB: number[] = [];

    for (const target of [snapshotA, snapshotB]) {
      const freshBoot = bootIL();
      await freshBoot.handle.tickUntil(
        () => new Decimal(freshBoot.state.loop.count.value).toNumber() >= 2,
        200_000,
      );
      pumpAchievements(freshBoot.state, 5);
      await freshBoot.handle.tick(1);
      freshBoot.handle.dispose();

      await withSeededMathRandom(999, async () => {
        const analyzer = createConvergenceAnalyzer(freshBoot.state.bestOf, 'str-xp');
        runHeadless({
          setup: () => {
            const analyzers = [analyzer];
            bindLoopAnalyzers(freshBoot.state.loopLog, analyzers);
            return analyzers;
          },
          tick: (dt) => freshBoot.handle.engine.loop.simulateTick(dt),
          ticks: 1500,
          tickDelta: TICK_DELTA,
          seed: 7,
        });
        target.push(...analyzer.samples);
      });
    }

    expect(snapshotA.length).toBeGreaterThan(0);
    expect(snapshotB.length).toBeGreaterThan(0);
    const common = Math.min(snapshotA.length, snapshotB.length);
    expect(snapshotA.slice(0, common)).toEqual(snapshotB.slice(0, common));
  });
});

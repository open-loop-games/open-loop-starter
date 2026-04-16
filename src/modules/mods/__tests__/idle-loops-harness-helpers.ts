/**
 * Shared helpers for the idle-loops harness fixture (OL-445).
 *
 * Three test families sit on top of these: tier-unlock (tiers.test),
 * tier-over-tier improvement (sensitivity.test), and long-run
 * monotonicity (convergence.test).
 *
 * Determinism notes:
 * - `runHeadless({ seed })` seeds the engine's Alea global via `seedRNG`.
 * - MutateBest's default rng is `Math.random` (threaded through
 *   `createIdleLoopsLoop` options); for deterministic runs we swap
 *   `Math.random` for the duration of a call via `withSeededMathRandom`.
 */
import { Decimal, type LoopAnalyzer, type LoopLogEntry, type BestOf } from 'open-loop-engine';
import { bootIL, type ILBoot } from '@/test/idle-loops/accessors';
import type { IdleLoopsState } from '@/modules/mods/idle-loops';
import { RECOMMENDATION_TIERS } from '@/modules/mods/idle-loops';

/** mulberry32 — small deterministic PRNG; good enough for test seeding. */
export function makeSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return function rand(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run `fn` with `Math.random` replaced by a mulberry32 RNG seeded from
 * `seed`. Restores the original Math.random on return. Use when a test
 * drives code that consumes Math.random directly (MutateBest, randomMutation).
 */
export async function withSeededMathRandom<T>(seed: number, fn: () => Promise<T>): Promise<T> {
  const original = Math.random;
  Math.random = makeSeededRng(seed);
  try {
    return await fn();
  } finally {
    Math.random = original;
  }
}

/** Lookup the achievement threshold for a tier id, or 0. */
export function tierThreshold(id: string): number {
  return RECOMMENDATION_TIERS.find((t) => t.id === id)?.achievementsRequired ?? 0;
}

/**
 * Force `state.achievements.earnedCount` to at least `target` by pumping
 * XP into stats and bumping the loop counter. Takes cumulative
 * transitive earns into account — e.g., pumping Str to level 5 earns
 * both `str-5` and `forest-unlocked` because the latter gates on the
 * same Str level.
 *
 * Reachable earnedCount values without executing an action:
 *   1  first-loop                          (loop.count ≥ 1)
 *   3  + str-5 + forest-unlocked           (str level ≥ 5)
 *   4  + all-stats-3                       (every stat ≥ 3)
 *   5  + stat-10                           (any stat ≥ 10)
 *   6  + loop-10                           (loop.count ≥ 10)
 *   7  + loop-25                           (loop.count ≥ 25)
 *
 * `dungeon-clear` (the 8th achievement) requires an actual queue.on
 * 'complete' event on dungeon-sprint and isn't pumpable here — callers
 * that need earnedCount ≥ 8 must skip that assertion when pumping.
 *
 * Does not synchronously flush watchers — caller must tick once after.
 */
export function pumpAchievements(state: IdleLoopsState, target: number): void {
  if (target >= 1 && new Decimal(state.loop.count.value).toNumber() < 1) {
    state.loop.count.value = 1;
  }
  if (target >= 2) state.stats.addXP('str', 50); // str-5, forest-unlocked
  if (target >= 4) {
    state.stats.addXP('int', 36);
    state.stats.addXP('dex', 30);
    state.stats.addXP('con', 42);
  }
  if (target >= 5) state.stats.addXP('str', 60); // str to 10 → stat-10
  if (target >= 6) {
    const cur = new Decimal(state.loop.count.value).toNumber();
    if (cur < 10) state.loop.count.value = 10;
  }
  if (target >= 7) {
    const cur = new Decimal(state.loop.count.value).toNumber();
    if (cur < 25) state.loop.count.value = 25;
  }
}

/**
 * LoopAnalyzer that records `bestOf.entries[metricKey].value` at every
 * loop finalize. Exposes the sample sequence for post-run monotonicity
 * assertions. Uses the `onLoopFinalize` hook rather than a direct
 * LoopLog subscription so it composes with `bindLoopAnalyzers`.
 */
export interface ConvergenceAnalyzer extends LoopAnalyzer {
  readonly samples: readonly number[];
}

export function createConvergenceAnalyzer(
  bestOf: BestOf,
  metricKey: string,
  name = 'il-convergence',
): ConvergenceAnalyzer {
  const samples: number[] = [];
  return {
    name,
    samples,
    onStart() {
      samples.length = 0;
    },
    onLoopFinalize(_entry: LoopLogEntry) {
      const entry = bestOf.entries.value[metricKey];
      const v = entry ? new Decimal(entry.value).toNumber() : 0;
      samples.push(v);
    },
    summarize() {
      return {
        name,
        metrics: {
          loops: samples.length,
          'best.first': samples[0] ?? 0,
          'best.last': samples[samples.length - 1] ?? 0,
          'best.max': samples.length > 0 ? Math.max(...samples) : 0,
        },
        issues: [],
      };
    },
  };
}

/**
 * Count consecutive regressions in a monotonic sequence. Returns the
 * longest run of strictly-decreasing steps. For a non-decreasing
 * sequence returns 0.
 */
export function maxConsecutiveRegressions(samples: readonly number[]): number {
  let max = 0;
  let run = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]! < samples[i - 1]!) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

/**
 * Fraction of restarts (i.e. sample transitions) that strictly advanced
 * the best-of metric. Returns 0 for sequences with fewer than 2 samples.
 */
export function advancementRate(samples: readonly number[]): number {
  if (samples.length < 2) return 0;
  let advances = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]! > samples[i - 1]!) advances += 1;
  }
  return advances / (samples.length - 1);
}

export { bootIL };
export type { ILBoot };

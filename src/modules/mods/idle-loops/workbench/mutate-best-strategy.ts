/**
 * MutateBest — custom RecommendationStrategyDef that proposes queue
 * mutations and evaluates them via a two-loop cadence.
 *
 * Tier 3a (blind): on evaluate N, pick a random mutation of the BestOf
 * snapshot and return the mutated queue as the recommendation. The engine's
 * autoApply (Tier 2) installs it, and LoopLog captures the real loop's
 * delta. On evaluate N+1, compare the observed delta against the BestOf
 * baseline: keep if improved, revert to the baseline if regressed.
 *
 * Tier 3b (sensitivity-scored) will extend this in a follow-up commit by
 * injecting a sensitivity config that replaces the blind pick with an
 * N-candidate headless sweep.
 *
 * Adapted from open-loop-engine's harness perturbation pattern
 * (src/harness/perturbation.ts + run-sensitivity.ts). Retargeted from
 * ModifierChain mutations to Sequencer queue mutations.
 */
import { Decimal, runSensitivity } from 'open-loop-engine';
import type {
  RecommendationStrategyDef,
  RecommendationContext,
  RecommendationResult,
  State,
  Cell,
  Variant,
} from 'open-loop-engine';
import { applyMutation, randomMutation, type QueueItem, type QueueMutation } from './queue-mutation';

export interface SensitivityConfig {
  /**
   * Earned-achievement threshold at which sensitivity mode activates.
   * Below this (but at or above MutateBestOptions.threshold) the strategy
   * stays in blind mode. Default 6.
   */
  threshold: number;
  /** Number of candidate mutations to test per evaluate(). Default 4. */
  candidateCount: number;
  /** Seeds passed to runSensitivity. Default [1, 2, 3]. */
  seeds: number[];
  /** Metric key the analyzer exposes for variant comparison. Matches MutateBestOptions.metricKey. */
  metricName: string;
  /**
   * Factory the caller provides to turn a queue snapshot into a harness
   * Cell. Used for both baseline and each variant. Encapsulates save-blob
   * export, module-factory wiring, analyzer construction, and tick driver
   * — the strategy treats the scratch engine as a black box.
   */
  buildCell: (name: string, queue: QueueItem[]) => Cell;
}

export interface MutateBestOptions {
  /** BestOf metric key the strategy is chasing (e.g. 'str-xp'). */
  metricKey: string;
  /** Number of earned achievements, used to gate the strategy. */
  earnedCount: () => number;
  /** All action IDs eligible for insertion mutations. */
  actionPool: () => string[];
  /** Earned-achievement threshold at which this strategy becomes active. Default 5. */
  threshold?: number;
  /** Injected RNG for testability. Default Math.random. */
  rng?: () => number;
  /**
   * If set, sensitivity-scored variant selection replaces blind mutation
   * once earnedCount reaches sensitivity.threshold. The config can be
   * installed lazily via the returned handle's setSensitivity() — useful
   * when scratch-engine infrastructure (e.g. SaveManager) isn't yet
   * available during module install().
   */
  sensitivity?: SensitivityConfig;
}

export interface MutateBestHandle {
  strategy: RecommendationStrategyDef;
  /** Install or replace the sensitivity config after construction. */
  setSensitivity(config: SensitivityConfig | null): void;
}

interface PendingMutation {
  mutation: QueueMutation;
  baselineValue: number;
  baselineSnapshot: QueueItem[];
}

/**
 * Create a MutateBest strategy handle. The `.strategy` field plugs into
 * `createRecommendationSystem`'s strategies array; `.setSensitivity()`
 * installs the scratch-engine config lazily (useful when SaveManager or
 * the module factory isn't available at install time).
 *
 * When sensitivity is configured and earnedCount has crossed its threshold,
 * `recommend()` generates N candidate mutations, scores each via
 * `runSensitivity` against fresh scratch engines, and returns the winner.
 * Below the sensitivity threshold the strategy falls back to blind
 * commit-and-measure (two-loop cadence).
 */
export function createMutateBestStrategy(opts: MutateBestOptions): MutateBestHandle {
  const { metricKey, earnedCount, actionPool, threshold = 5, rng = Math.random } = opts;

  let pending: PendingMutation | null = null;
  let sensitivity: SensitivityConfig | null = opts.sensitivity ?? null;

  function readBaseline(ctx: RecommendationContext): { snapshot: QueueItem[]; value: number } | null {
    const entry = ctx.bestOf.entries.value[metricKey];
    if (!entry || entry.status !== 'valid' || entry.strategySnapshot == null) return null;
    const snap = entry.strategySnapshot as unknown as QueueItem[];
    if (!Array.isArray(snap)) return null;
    return { snapshot: snap.map((item) => ({ id: item.id })), value: new Decimal(entry.value).toNumber() };
  }

  /** Most recent per-run delta for metricKey, read from LoopLog history. */
  function lastDelta(ctx: RecommendationContext): number {
    const history = ctx.loopLog.history.value;
    if (history.length === 0) return 0;
    const last = history[history.length - 1]!;
    const metric = last.deltas.find((d) => d.key === metricKey);
    if (!metric) return 0;
    return new Decimal(metric.delta).toNumber();
  }

  function recommendSensitivity(
    baseline: { snapshot: QueueItem[]; value: number },
    cfg: SensitivityConfig,
  ): RecommendationResult {
    const pool = actionPool();
    const candidates: { mutation: QueueMutation; snapshot: QueueItem[] }[] = [];
    for (let i = 0; i < cfg.candidateCount; i++) {
      const mutation = randomMutation(baseline.snapshot, pool, rng);
      if (!mutation) break;
      candidates.push({ mutation, snapshot: applyMutation(baseline.snapshot, mutation) });
    }

    if (candidates.length === 0) {
      return {
        snapshot: { queue: baseline.snapshot } as unknown as State,
        rationale: {
          strategyId: 'il-mutate-best',
          metrics: {},
          summary: 'MutateBest (sensitivity): no viable mutation; holding baseline',
        },
      };
    }

    const baselineCell = cfg.buildCell('baseline', baseline.snapshot);
    const variants: Variant[] = candidates.map((c, i) => ({
      name: `candidate-${i}`,
      patch: () => cfg.buildCell(`candidate-${i}`, c.snapshot),
    }));

    const result = runSensitivity({ baseline: baselineCell, variants, seeds: cfg.seeds });
    const metricPath = `loop-log.${cfg.metricName}`;

    let winnerIdx = -1;
    let winnerDelta = -Infinity;
    for (let i = 0; i < result.variants.length; i++) {
      const delta = result.variants[i]!.deltas[metricPath]?.absolute ?? 0;
      if (delta > winnerDelta) {
        winnerDelta = delta;
        winnerIdx = i;
      }
    }

    if (winnerIdx < 0 || winnerDelta <= 0) {
      return {
        snapshot: { queue: baseline.snapshot } as unknown as State,
        rationale: {
          strategyId: 'il-mutate-best',
          metrics: {},
          summary: `MutateBest (sensitivity): no candidate beat baseline over ${candidates.length} tries`,
        },
      };
    }

    const winner = candidates[winnerIdx]!;
    return {
      snapshot: { queue: winner.snapshot } as unknown as State,
      rationale: {
        strategyId: 'il-mutate-best',
        metrics: {
          [metricKey]: {
            current: baseline.value,
            projected: baseline.value + winnerDelta,
            delta: winnerDelta,
          },
        },
        summary: `MutateBest (sensitivity): ${describeMutation(winner.mutation)} wins by ${winnerDelta.toFixed(1)} over ${candidates.length} candidates`,
      },
    };
  }

  const strategy: RecommendationStrategyDef = {
    id: 'il-mutate-best',

    canApply: (ctx) => {
      if (earnedCount() < threshold) return false;
      return readBaseline(ctx) != null;
    },

    score: (ctx) => {
      // BestReplay scores on entry.perSecond (or entry.value fallback).
      // Match that scoring, then add a small bump so MutateBest wins
      // arbitration when both apply.
      const entry = ctx.bestOf.entries.value[metricKey];
      if (!entry) return 0;
      const ps = new Decimal(entry.perSecond).toNumber();
      const base = Number.isFinite(ps) ? ps : new Decimal(entry.value).toNumber();
      return base + 1;
    },

    recommend: (ctx): RecommendationResult => {
      const baseline = readBaseline(ctx)!;

      // Sensitivity path: N candidates scored against scratch engines.
      // Skips the two-loop cadence — the scratch runs replace blind measurement.
      if (sensitivity && earnedCount() >= sensitivity.threshold) {
        pending = null;
        return recommendSensitivity(baseline, sensitivity);
      }

      if (pending == null) {
        // Propose phase: mutate the baseline and return the mutated queue.
        const mutation = randomMutation(baseline.snapshot, actionPool(), rng);
        const mutated = mutation ? applyMutation(baseline.snapshot, mutation) : baseline.snapshot;
        pending = mutation
          ? { mutation, baselineValue: baseline.value, baselineSnapshot: baseline.snapshot }
          : null;

        const summary = mutation
          ? `MutateBest: trying ${describeMutation(mutation)} against best ${metricKey}`
          : `MutateBest: no viable mutation; holding baseline`;
        return {
          snapshot: { queue: mutated } as unknown as State,
          rationale: {
            strategyId: 'il-mutate-best',
            metrics: {},
            summary,
          },
        };
      }

      // Evaluate phase: compare last delta to the baseline value. If we
      // improved, commit (return current snapshot — BestOf will have
      // already captured the win if it was a record). If we regressed,
      // revert to the baseline snapshot.
      const observed = lastDelta(ctx);
      const baselineValue = pending.baselineValue;
      const improved = observed >= baselineValue;
      const resultSnapshot: State = improved
        ? ctx.currentSnapshot
        : ({ queue: pending.baselineSnapshot } as unknown as State);
      const verdict = improved ? 'kept' : 'reverted';
      const summary = `MutateBest: ${describeMutation(pending.mutation)} — ${verdict} (observed ${observed.toFixed(1)}, baseline ${baselineValue.toFixed(1)})`;

      pending = null;

      return {
        snapshot: resultSnapshot,
        rationale: {
          strategyId: 'il-mutate-best',
          metrics: {
            [metricKey]: {
              current: observed,
              projected: baselineValue,
              delta: observed - baselineValue,
            },
          },
          summary,
        },
      };
    },
  };

  return {
    strategy,
    setSensitivity(config) {
      sensitivity = config;
    },
  };
}

function describeMutation(m: QueueMutation): string {
  switch (m.kind) {
    case 'swap':
      return `swap[${m.indexA}↔${m.indexB}]`;
    case 'duplicate':
      return `duplicate[${m.sourceIndex}]`;
    case 'remove':
      return `remove[${m.index}]`;
    case 'insert':
      return `insert[${m.index}=${m.actionId}]`;
  }
}

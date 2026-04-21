import {
  runMatrixUntil,
  type Engine,
  type MetricStats,
  type RunContext,
  type UntilCell,
  type UntilPredicate,
} from 'open-loop-engine';

/** Per-beat termination-time distribution from a `seeds`-wide sweep. */
export interface BeatArcResult {
  beatId: string;
  /** § 4 spec window in seconds, `[lower, upper]`. */
  specWindow: [number, number];
  /** Termination-time stats over the seed sweep (predicate-terminated runs only). */
  terminationTime: MetricStats | undefined;
  /** Counts of how each seed terminated. */
  counts: { predicate: number; maxSimTime: number };
  /** True iff `terminationTime.p50` falls inside `specWindow`. */
  inWindow: boolean;
}

export interface ArcBeatProbe {
  id: string;
  /** § 4 window in seconds, `[lower, upper]`. */
  specWindow: [number, number];
  /** Predicate evaluating engine state, fired when the beat lands. */
  predicate: (engine: Engine) => boolean;
}

export interface ArcProbeConfig {
  /** Build a fresh, started, bot-driven engine for each `(cell × seed)` run. */
  buildEngine: (ctx: RunContext) => Engine;
  beats: ArcBeatProbe[];
  /** Seeds to run per beat. 5 is the ticket's recommendation. */
  seeds: number[];
  /**
   * Sim-seconds ceiling per run. Should be ≥ 2× the largest beat upper bound
   * to leave headroom for outlier seeds without runaway cost.
   */
  maxSimTime: number;
  /**
   * Seconds of sim-time per tick. Defaults to 1s — balance work is measured
   * in minutes, so sub-second tick fidelity is wasted cost (a 2h arc at the
   * engine-default 0.05s is 144,000 ticks per run; at 1s it's 7,200). Lower
   * only when a beat predicate depends on sub-second timing (flow-probe
   * dynamics, tight sequencing).
   */
  tickDelta?: number;
}

/**
 * For each beat: run `seeds.length` engines until the predicate fires (or
 * `maxSimTime` is reached), aggregate the termination-time distribution,
 * and check whether the median lands inside the spec window.
 *
 * One `runMatrixUntil` call per beat — the predicate differs by beat, and
 * that's the input that varies. Engine builds are reused across beats only
 * incidentally (a fresh engine per `(beat × seed)` either way).
 */
export function runArcProbe(config: ArcProbeConfig): BeatArcResult[] {
  const tickDelta = config.tickDelta ?? 1;
  const out: BeatArcResult[] = [];
  for (const beat of config.beats) {
    let engineForPredicate: Engine | undefined;

    const cell: UntilCell = {
      name: beat.id,
      tickDelta,
      buildEngine: (ctx) => {
        const engine = config.buildEngine(ctx);
        engineForPredicate = engine;
        return engine;
      },
    };

    const until: UntilPredicate = () => {
      if (!engineForPredicate) return false;
      return beat.predicate(engineForPredicate);
    };

    const result = runMatrixUntil({
      cells: [cell],
      seeds: config.seeds,
      until,
      maxSimTime: config.maxSimTime,
    });

    const aggregate = result.cells[0]!.aggregate;
    const terminationTime = aggregate.terminationTime;
    const counts = aggregate.terminationCounts ?? { predicate: 0, maxSimTime: 0 };
    const p50 = terminationTime?.p50 ?? Infinity;
    const inWindow = p50 >= beat.specWindow[0] && p50 <= beat.specWindow[1];

    out.push({
      beatId: beat.id,
      specWindow: beat.specWindow,
      terminationTime,
      counts,
      inWindow,
    });
  }
  return out;
}

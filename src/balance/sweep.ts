import {
  diffAggregates,
  runMatrixUntil,
  type CellAggregate,
  type MetricDelta,
  type RunContext,
  type Engine,
  type UntilCell,
  type UntilPredicate,
} from 'open-loop-engine';

/**
 * One axis to perturb in a balance sweep — a label, the values to try, and
 * a function that produces a fresh `buildEngine` for each value. The
 * `buildEngine` it returns must wire the same bot policy as the baseline
 * (only the value-under-test should differ).
 */
export interface SweepAxis<V> {
  name: string;
  values: V[];
  applyToBuildEngine: (value: V) => (ctx: RunContext) => Engine;
}

export interface SweepCellResult {
  axis: string;
  value: unknown;
  aggregate: CellAggregate;
  /** Delta vs. the baseline cell. Empty for the baseline cell itself. */
  vsBaseline: Record<string, MetricDelta>;
}

export interface SweepResult {
  beatId: string;
  baseline: SweepCellResult;
  cells: SweepCellResult[];
}

export interface SweepConfig {
  beatId: string;
  /** Predicate marking when the beat lands. */
  predicate: (engine: Engine) => boolean;
  /** Baseline `(ctx) => Engine` — the chosen-balance build. */
  baselineBuildEngine: (ctx: RunContext) => Engine;
  axes: SweepAxis<unknown>[];
  seeds: number[];
  maxSimTime: number;
}

/**
 * Sweep one beat's predicate across `axes`, comparing each cell's
 * termination-time distribution to the baseline.
 *
 * Use after the diagnostic table is green — confirms the chosen balance
 * isn't a knife-edge by walking ±10–15% on each axis and checking the
 * beat stays in window.
 */
export function runSweep(config: SweepConfig): SweepResult {
  const closure: { engine?: Engine } = {};

  const baselineCell: UntilCell = {
    name: 'baseline',
    buildEngine: (ctx) => {
      const engine = config.baselineBuildEngine(ctx);
      closure.engine = engine;
      return engine;
    },
  };

  const variantCells: UntilCell[] = config.axes.flatMap((axis) =>
    axis.values.map<UntilCell>((value) => ({
      name: `${axis.name}=${String(value)}`,
      buildEngine: (ctx) => {
        const engine = axis.applyToBuildEngine(value)(ctx);
        closure.engine = engine;
        return engine;
      },
    })),
  );

  const until: UntilPredicate = () => (closure.engine ? config.predicate(closure.engine) : false);

  const result = runMatrixUntil({
    cells: [baselineCell, ...variantCells],
    seeds: config.seeds,
    until,
    maxSimTime: config.maxSimTime,
  });

  const baselineAgg = result.cells[0]!.aggregate;
  const baseline: SweepCellResult = {
    axis: 'baseline',
    value: 'baseline',
    aggregate: baselineAgg,
    vsBaseline: {},
  };

  const cells: SweepCellResult[] = [];
  let cellIdx = 1;
  for (const axis of config.axes) {
    for (const value of axis.values) {
      const cellAgg = result.cells[cellIdx]!.aggregate;
      cells.push({
        axis: axis.name,
        value,
        aggregate: cellAgg,
        vsBaseline: diffAggregates(cellAgg, baselineAgg),
      });
      cellIdx++;
    }
  }

  return { beatId: config.beatId, baseline, cells };
}

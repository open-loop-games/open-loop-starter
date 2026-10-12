/**
 * Reactive state machine for the balance workbench's cycle:
 * pick → build scratch engines → run a sweep → render delta → commit/revert.
 *
 * The composable owns nothing rendered — it exposes refs and actions that
 * the `BalanceWorkbench.vue` component binds to. Tests can drive it without
 * mounting Vue.
 *
 * Run model: each `run()` call exports the live engine's save text, builds
 * a baseline cell + a single variant cell via `createSensitivityCell`, and
 * passes both to `runSensitivity`. The variant's `perturb` option callback calls
 * `applyPerturbation` against the *per-run* engine using the entry's
 * address — entries carry addresses, not refs, so this resolves correctly
 * against fresh engines.
 *
 * Commit/revert model: `commit()` calls `applyPerturbation` directly on
 * the live engine and stores the cleanup. `revert()` runs the cleanup.
 * The live engine's saved state remains the unperturbed form — perturbations
 * are ephemeral and do not survive a reload. (This is testing infrastructure, not a
 * save-mutating balance editor.)
 */

import { computed, reactive, ref, shallowRef, type Ref } from 'vue';
import {
  createSensitivityCell,
  defaultAnalyzerPack,
  ResourceRegistryKey,
  runSensitivity,
  timeSeriesAnalyzerPack,
  type Analyzer,
  type CellAggregate,
  type CellResult,
  type Engine,
  type EngineModule,
  type MetricDelta,
  type RunContext,
  type SensitivityResult,
} from '@open-loop/engine';
import {
  createPickerSnapshot,
  applyPerturbation,
  type PickerEntry,
  type PickerSnapshot,
  type Perturbation,
} from '@open-loop/engine/harness';

export interface BalanceWorkbenchOptions {
  /** Live engine being inspected. Picker walks it; commit mutates it directly. */
  engine: Engine;
  /**
   * Factory returning fresh module instances for the per-run scratch engines.
   * Required: workbench cannot reconstruct the consumer's module graph itself.
   */
  modules: () => EngineModule[];
  /**
   * Per-run tick driver. Defaults to `engine.tickDriver.tickOnce()`. Override for
   * games with custom tick semantics in the balance harness.
   */
  tick?: (engine: Engine, dt: number) => void;
  /**
   * Analyzer factory for each per-run engine. Defaults to
   * `defaultAnalyzerPack(engine)`.
   */
  analyzerPack?: (engine: Engine) => Analyzer[];
  /**
   * Runs on every per-run engine (baseline + variant), after engine build and
   * before any perturbation or tick. Receives the balance harness's
   * `RunContext`, so stochastic consumers can route `ctx.seed` into per-run RNG
   * seeding or simulation-reset handlers. The routing is symmetric across cells,
   * so baseline/variant deltas compare matched seeded trajectories, not
   * "variant got the seed, baseline didn't."
   *
   * Ordering: `prepare(engine, ctx)` → (variant only) `applyPerturbation(...)`
   * → `buildAnalyzers(engine)` → iterations.
   */
  prepare?: (engine: Engine, ctx: RunContext) => void;
}

export type PerturbationKind = Perturbation['kind'];

export interface PerturbationForm {
  kind: PerturbationKind;
  factor: number;
  delta: number;
  seedCount: number;
  iterations: number;
  /**
   * Capture per-iteration resource trajectories (baseline vs variant) for charting.
   * Fans each tracked resource out to `iterations` metric keys per run, so it's
   * opt-in — off by default keeps a plain sensitivity run scalar-cheap.
   */
  captureTimeSeries: boolean;
}

export interface DeltaRow {
  metric: string;
  baselineAvg: number;
  variantAvg: number;
  delta: MetricDelta;
}

/** One tick's baseline/variant band, aggregated across the seed sweep. */
export interface TrajectoryBand {
  tick: number;
  mean: number;
  min: number;
  max: number;
}

/** Per-resource baseline-vs-variant trajectory reconstructed from series metrics. */
export interface Trajectory {
  /** Resolved from the `time-series:{id}` suffix through the resource registry. */
  displayName: string;
  baseline: TrajectoryBand[];
  variant: TrajectoryBand[];
}

export interface RunProgress {
  /** Names of cells that have completed since `run()` was last called. */
  completedCells: string[];
  /** Total runs (cells × seeds) completed. */
  completedRuns: number;
  totalRuns: number;
}

export interface UseBalanceWorkbenchReturn {
  snapshot: Ref<PickerSnapshot>;
  selectedEntry: Ref<PickerEntry | null>;
  form: PerturbationForm;
  running: Ref<boolean>;
  result: Ref<SensitivityResult | null>;
  progress: Ref<RunProgress>;
  rows: Ref<DeltaRow[]>;
  headline: Ref<DeltaRow | null>;
  /** All captured resource trajectories from the last run (empty if time-series capture was off). */
  trajectories: Ref<Trajectory[]>;
  /** Resource display names available to chart, in aggregate order. */
  trajectoryDisplayNames: Ref<string[]>;
  /** Which trajectory the chart shows; defaults to the first captured resource. */
  selectedTrajectoryDisplayName: Ref<string | null>;
  /** The trajectory matching `selectedTrajectoryDisplayName`, or null. */
  selectedTrajectory: Ref<Trajectory | null>;
  error: Ref<string | null>;
  committed: Ref<boolean>;
  canPerturb: Ref<boolean>;
  refreshPicker: () => void;
  selectEntry: (entry: PickerEntry | null) => void;
  buildPerturbation: () => Perturbation;
  run: () => void;
  commit: () => void;
  revert: () => void;
}

const SERIES_KEY = /^time-series:(.*)\.t(\d+)$/;

/**
 * Reconstruct per-resource `{tick, mean, min, max}` bands from a cell's
 * aggregated `time-series:{id}.t{i}` metrics, keyed by resource id; callers
 * resolve the display label. Each per-tick metric already carries the
 * across-seed distribution (the aggregator's job), so the band is a direct
 * read of `avg`/`min`/`max` — no re-aggregation here.
 */
function reconstructBands(aggregate: CellAggregate): Record<string, TrajectoryBand[]> {
  const byId: Record<string, TrajectoryBand[]> = {};
  for (const [key, stats] of Object.entries(aggregate.metrics)) {
    const match = SERIES_KEY.exec(key);
    if (!match) continue;
    const id = match[1]!;
    const tick = Number(match[2]);
    (byId[id] ??= []).push({ tick, mean: stats.avg, min: stats.min, max: stats.max });
  }
  for (const bands of Object.values(byId)) {
    bands.sort((a, b) => a.tick - b.tick);
  }
  return byId;
}

export function useBalanceWorkbench(options: BalanceWorkbenchOptions): UseBalanceWorkbenchReturn {
  const {
    engine,
    modules,
    tick = (e: Engine) => e.tickDriver.tickOnce(),
    analyzerPack = (e: Engine) => defaultAnalyzerPack(e),
    prepare,
  } = options;

  const snapshot = shallowRef<PickerSnapshot>(createPickerSnapshot(engine));
  const selectedEntry = ref<PickerEntry | null>(null) as Ref<PickerEntry | null>;

  const form = reactive<PerturbationForm>({
    kind: 'scalar-multiply',
    factor: 2,
    delta: 1,
    seedCount: 20,
    iterations: 200,
    captureTimeSeries: true,
  });

  const running = ref(false);
  const result = shallowRef<SensitivityResult | null>(null);
  const progress = ref<RunProgress>({ completedCells: [], completedRuns: 0, totalRuns: 0 });
  const error = ref<string | null>(null);

  const partialCells = shallowRef<Record<string, CellResult>>({});

  let liveCleanup: (() => void) | null = null;
  const committed = ref(false);

  const canPerturb = computed(() => selectedEntry.value !== null);

  const rows = computed<DeltaRow[]>(() => {
    const r = result.value;
    if (!r) return [];
    const variant = r.variants[0];
    if (!variant) return [];
    return (
      Object.entries(variant.deltas)
        // Per-tick series metrics are charted separately — keep them out of the
        // scalar delta table so it isn't flooded with `time-series:*.t*` rows.
        .filter(([metric]) => !metric.startsWith('time-series:'))
        .map(([metric, delta]) => ({
          metric,
          baselineAvg: r.baseline.aggregate.metrics[metric]?.avg ?? 0,
          variantAvg: variant.cell.aggregate.metrics[metric]?.avg ?? 0,
          delta,
        }))
        .sort((a, b) => Math.abs(b.delta.relative) - Math.abs(a.delta.relative))
    );
  });

  const headline = computed<DeltaRow | null>(() => rows.value[0] ?? null);

  const trajectories = computed<Trajectory[]>(() => {
    const r = result.value;
    const variant = r?.variants[0];
    if (!r || !variant) return [];
    const baseBands = reconstructBands(r.baseline.aggregate);
    const variantBands = reconstructBands(variant.cell.aggregate);
    const resources = engine.tryInject(ResourceRegistryKey);
    const ids = Object.keys(baseBands);
    return ids.map((id) => ({
      displayName: resources?.findById(id)?.displayName ?? id,
      baseline: baseBands[id] ?? [],
      variant: variantBands[id] ?? [],
    }));
  });

  const trajectoryDisplayNames = computed<string[]>(() =>
    trajectories.value.map((t) => t.displayName),
  );

  const selectedTrajectoryDisplayName = ref<string | null>(null);

  const selectedTrajectory = computed<Trajectory | null>(() => {
    const list = trajectories.value;
    if (list.length === 0) return null;
    const want = selectedTrajectoryDisplayName.value;
    return list.find((t) => t.displayName === want) ?? list[0] ?? null;
  });

  function refreshPicker(): void {
    snapshot.value = createPickerSnapshot(engine);
  }

  function selectEntry(entry: PickerEntry | null): void {
    selectedEntry.value = entry;
  }

  function buildPerturbation(): Perturbation {
    return form.kind === 'scalar-multiply'
      ? { kind: 'scalar-multiply', factor: form.factor }
      : { kind: 'scalar-add', delta: form.delta };
  }

  function run(): void {
    if (running.value) return;
    const entry = selectedEntry.value;
    if (!entry) {
      error.value = 'No picker entry selected';
      return;
    }
    if (!engine.saveManager) {
      error.value = 'Engine has no saveManager — persistence: true required';
      return;
    }

    error.value = null;
    running.value = true;
    result.value = null;
    partialCells.value = {};

    const seeds = Array.from({ length: form.seedCount }, (_, i) => i + 1);
    const totalRuns = seeds.length * 2; // baseline + 1 variant
    progress.value = { completedCells: [], completedRuns: 0, totalRuns };

    try {
      const saveText = engine.saveManager.exportSave();
      const perturbation = buildPerturbation();

      // Both cells must share one analyzer set so their metric keys align for
      // the baseline-vs-variant diff. Time-series capture appends per-resource
      // trackers on top of the scalar pack.
      const captureTimeSeries = form.captureTimeSeries;
      const buildAnalyzers = (e: Engine): Analyzer[] =>
        captureTimeSeries ? [...analyzerPack(e), ...timeSeriesAnalyzerPack(e)] : analyzerPack(e);

      const baseline = createSensitivityCell({
        id: 'baseline',
        saveText,
        modules,
        ...(prepare && { perturb: (e, ctx) => prepare(e, ctx) }),
        buildAnalyzers,
        tick,
        iterations: form.iterations,
      });
      const variant = createSensitivityCell({
        id: 'variant',
        saveText,
        modules,
        perturb: (e, ctx) => {
          prepare?.(e, ctx);
          applyPerturbation(e, entry, perturbation);
        },
        buildAnalyzers,
        tick,
        iterations: form.iterations,
      });

      const sensitivity = runSensitivity({
        baseline,
        variants: [{ id: 'variant', patch: () => variant }],
        seeds,
        onRunComplete: () => {
          progress.value = {
            ...progress.value,
            completedRuns: progress.value.completedRuns + 1,
          };
        },
        onCellComplete: (cell) => {
          partialCells.value = { ...partialCells.value, [cell.id]: cell };
          progress.value = {
            ...progress.value,
            completedCells: [...progress.value.completedCells, cell.id],
          };
        },
      });

      result.value = sensitivity;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      running.value = false;
    }
  }

  function commit(): void {
    const entry = selectedEntry.value;
    if (!entry) {
      error.value = 'No picker entry selected';
      return;
    }
    revert();
    try {
      liveCleanup = applyPerturbation(engine, entry, buildPerturbation());
      committed.value = true;
      error.value = null;
    } catch (err) {
      liveCleanup = null;
      committed.value = false;
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  function revert(): void {
    if (liveCleanup) {
      liveCleanup();
      liveCleanup = null;
    }
    committed.value = false;
  }

  return {
    snapshot,
    selectedEntry,
    form,
    running,
    result,
    progress,
    rows,
    headline,
    trajectories,
    trajectoryDisplayNames,
    selectedTrajectoryDisplayName,
    selectedTrajectory,
    error,
    committed,
    canPerturb,
    refreshPicker,
    selectEntry,
    buildPerturbation,
    run,
    commit,
    revert,
  };
}

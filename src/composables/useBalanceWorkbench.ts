/**
 * Reactive state machine for the balance workbench loop:
 * pick → fork → run sensitivity → render delta → commit/discard.
 *
 * The composable owns nothing rendered — it exposes refs and actions that
 * the `BalanceWorkbench.vue` component binds to. Tests can drive it without
 * mounting Vue.
 *
 * Run model: each `run()` call exports the live engine's save blob, builds
 * a baseline cell + a single variant cell via `buildSensitivityCell`, and
 * passes both to `runSensitivity`. The variant's `perturb` hook calls
 * `applyPerturbation` against the *per-run* engine using the entry's
 * address — entries carry addresses, not refs, so this resolves correctly
 * against fresh engines.
 *
 * Commit/discard model: `commit()` calls `applyPerturbation` directly on
 * the live engine and stores the cleanup. `discard()` runs the cleanup.
 * The live engine's saved state remains the unperturbed form — perturbations
 * are not persisted across reloads. (This is testing infrastructure, not a
 * save-mutating balance editor.)
 */

import { computed, reactive, ref, shallowRef, type Ref } from 'vue';
import {
  buildSensitivityCell,
  defaultAnalyzerPack,
  runSensitivity,
  type Analyzer,
  type CellResult,
  type Engine,
  type EngineModule,
  type MetricDelta,
  type SensitivityResult,
} from 'open-loop-engine';
import {
  buildPickerSnapshot,
  applyPerturbation,
  type PickerEntry,
  type PickerSnapshot,
  type Perturbation,
} from 'open-loop-engine/harness';

export interface BalanceWorkbenchOptions {
  /** Live engine being inspected. Picker walks it; commit mutates it directly. */
  engine: Engine;
  /**
   * Factory returning fresh module instances for the per-run scratch engines.
   * Required: workbench cannot reconstruct the consumer's module graph itself.
   */
  modules: () => EngineModule[];
  /**
   * Per-run tick driver. Defaults to `engine.loop.stepOnce()`. Override for
   * games with custom harness step semantics.
   */
  tick?: (engine: Engine, dt: number) => void;
  /**
   * Analyzer factory for each per-run engine. Defaults to
   * `defaultAnalyzerPack(engine)`.
   */
  analyzerPack?: (engine: Engine) => Analyzer[];
}

export type PerturbationKind = Perturbation['kind'];

export interface PerturbationForm {
  kind: PerturbationKind;
  factor: number;
  delta: number;
  seedCount: number;
  ticks: number;
}

export interface DeltaRow {
  metric: string;
  baselineAvg: number;
  variantAvg: number;
  delta: MetricDelta;
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
  error: Ref<string | null>;
  committed: Ref<boolean>;
  canPerturb: Ref<boolean>;
  refreshPicker: () => void;
  selectEntry: (entry: PickerEntry | null) => void;
  buildPerturbation: () => Perturbation;
  run: () => void;
  commit: () => void;
  discard: () => void;
}

export function useBalanceWorkbench(options: BalanceWorkbenchOptions): UseBalanceWorkbenchReturn {
  const {
    engine,
    modules,
    tick = (e: Engine) => e.loop.stepOnce(),
    analyzerPack = (e: Engine) => defaultAnalyzerPack(e),
  } = options;

  const snapshot = shallowRef<PickerSnapshot>(buildPickerSnapshot(engine));
  const selectedEntry = ref<PickerEntry | null>(null) as Ref<PickerEntry | null>;

  const form = reactive<PerturbationForm>({
    kind: 'scalar-multiply',
    factor: 2,
    delta: 1,
    seedCount: 20,
    ticks: 200,
  });

  const running = ref(false);
  const result = shallowRef<SensitivityResult | null>(null);
  const progress = ref<RunProgress>({ completedCells: [], completedRuns: 0, totalRuns: 0 });
  const error = ref<string | null>(null);

  const partialCells = shallowRef<Record<string, CellResult>>({});

  let liveCleanup: (() => void) | null = null;
  const committed = ref(false);

  const canPerturb = computed(() => {
    const e = selectedEntry.value;
    if (!e) return false;
    if (e.address.source === 'category' && e.address.category === 'skills') return false;
    return true;
  });

  const rows = computed<DeltaRow[]>(() => {
    const r = result.value;
    if (!r) return [];
    const variant = r.variants[0];
    if (!variant) return [];
    return Object.entries(variant.deltas)
      .map(([metric, delta]) => ({
        metric,
        baselineAvg: r.baseline.aggregate.metrics[metric]?.avg ?? 0,
        variantAvg: variant.cell.aggregate.metrics[metric]?.avg ?? 0,
        delta,
      }))
      .sort((a, b) => Math.abs(b.delta.relative) - Math.abs(a.delta.relative));
  });

  const headline = computed<DeltaRow | null>(() => rows.value[0] ?? null);

  function refreshPicker(): void {
    snapshot.value = buildPickerSnapshot(engine);
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
    if (!canPerturb.value) {
      error.value = 'Selected entry is not perturbable in v1';
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
      const blob = engine.saveManager.exportSave();
      const perturbation = buildPerturbation();

      const baseline = buildSensitivityCell({
        name: 'baseline',
        saveBlob: blob,
        modules,
        buildAnalyzers: analyzerPack,
        tick,
        ticks: form.ticks,
      });
      const variant = buildSensitivityCell({
        name: 'variant',
        saveBlob: blob,
        modules,
        perturb: (e, _ctx) => {
          applyPerturbation(e, entry, perturbation);
        },
        buildAnalyzers: analyzerPack,
        tick,
        ticks: form.ticks,
      });

      const sensitivity = runSensitivity({
        baseline,
        variants: [{ name: 'variant', patch: () => variant }],
        seeds,
        onRunComplete: () => {
          progress.value = {
            ...progress.value,
            completedRuns: progress.value.completedRuns + 1,
          };
        },
        onCellComplete: (cell) => {
          partialCells.value = { ...partialCells.value, [cell.name]: cell };
          progress.value = {
            ...progress.value,
            completedCells: [...progress.value.completedCells, cell.name],
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
    if (!canPerturb.value) {
      error.value = 'Selected entry is not perturbable in v1';
      return;
    }
    discard();
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

  function discard(): void {
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
    error,
    committed,
    canPerturb,
    refreshPicker,
    selectEntry,
    buildPerturbation,
    run,
    commit,
    discard,
  };
}

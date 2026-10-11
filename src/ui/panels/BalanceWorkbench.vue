<script setup lang="ts">
import { computed } from 'vue';
import {
  ListboxContent,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui';
import type { Analyzer, Engine, EngineModule, RunContext } from '@open-loop/engine';
import type { PickerEntry } from '@open-loop/engine/harness';
import Button from '@/ui/components/Button.vue';
import TrajectoryChart from '@/ui/components/TrajectoryChart.vue';
import { useBalanceWorkbench } from '@/composables/useBalanceWorkbench';

const props = defineProps<{
  engine: Engine;
  modules: () => EngineModule[];
  tick?: (engine: Engine, dt: number) => void;
  analyzerPack?: (engine: Engine) => Analyzer[];
  prepare?: (engine: Engine, ctx: RunContext) => void;
}>();

const wb = useBalanceWorkbench({
  engine: props.engine,
  modules: props.modules,
  ...(props.tick && { tick: props.tick }),
  ...(props.analyzerPack && { analyzerPack: props.analyzerPack }),
  ...(props.prepare && { prepare: props.prepare }),
});

interface Group {
  key: string;
  title: string;
  entries: readonly PickerEntry[];
}

const groups = computed<Group[]>(() => {
  const snap = wb.snapshot.value;
  return [
    { key: 'effectSystem', title: 'Effect systems', entries: snap.effectSystem },
    { key: 'chains', title: 'Chains', entries: snap.chains },
    { key: 'tunables', title: 'Tunables', entries: snap.tunables },
  ];
});

function entryKey(group: Group, entry: PickerEntry): string {
  return `${group.key}|${entry.label}`;
}

const selectedKey = computed<string | null>(() => {
  const sel = wb.selectedEntry.value;
  if (!sel) return null;
  for (const group of groups.value) {
    for (const entry of group.entries) {
      if (entry.label === sel.label && entry.address.walker === sel.address.walker) {
        return entryKey(group, entry);
      }
    }
  }
  return null;
});

function pickByKey(value: unknown): void {
  if (typeof value !== 'string') return;
  for (const group of groups.value) {
    for (const entry of group.entries) {
      if (entryKey(group, entry) === value) {
        wb.selectEntry(entry);
        return;
      }
    }
  }
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 0.001 || abs >= 1e6) return n.toExponential(2);
  return n.toFixed(abs < 1 ? 4 : 2);
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return `${(n * 100).toFixed(1)}%`;
}

const kindModel = computed<'scalar-multiply' | 'scalar-add'>({
  get: () => wb.form.kind,
  set: (next) => {
    if (next) wb.form.kind = next;
  },
});

const seriesModel = computed<string | null>({
  get: () => wb.selectedTrajectory.value?.name ?? null,
  set: (next) => {
    if (next) wb.selectedSeriesName.value = next;
  },
});
</script>

<template>
  <div class="balance-workbench">
    <section class="bw-pane bw-pane--picker">
      <header class="bw-pane__header">Picker</header>
      <div class="bw-pane__body">
        <ListboxRoot :model-value="selectedKey" @update:model-value="pickByKey">
          <ListboxContent>
            <ListboxGroup v-for="group in groups" :key="group.key" class="picker-group">
              <ListboxGroupLabel class="picker-group-title">
                {{ group.title }}
              </ListboxGroupLabel>
              <div v-if="group.entries.length === 0" class="picker-empty">— none —</div>
              <ListboxItem
                v-for="entry in group.entries"
                :key="entryKey(group, entry)"
                :value="entryKey(group, entry)"
                class="picker-row"
                :title="entry.label"
              >
                {{ entry.label }}
              </ListboxItem>
            </ListboxGroup>
          </ListboxContent>
        </ListboxRoot>
        <div class="picker-actions">
          <Button type="button" class="bw-btn bw-btn--ghost" @click="wb.refreshPicker()">
            Refresh
          </Button>
        </div>
      </div>
    </section>

    <section class="bw-pane bw-pane--form">
      <header class="bw-pane__header">Perturbation</header>
      <div class="bw-pane__body">
        <div class="form-grid">
          <div class="form-row">
            <label class="bw-label">Selected</label>
            <div class="form-value">
              {{ wb.selectedEntry.value?.label ?? '— pick an entry —' }}
            </div>
          </div>

          <div class="form-row">
            <label class="bw-label">Kind</label>
            <ToggleGroupRoot
              v-model="kindModel"
              type="single"
              :roving-focus="true"
              class="kind-toggle"
              aria-label="Perturbation kind"
            >
              <ToggleGroupItem value="scalar-multiply" class="bw-btn"> × </ToggleGroupItem>
              <ToggleGroupItem value="scalar-add" class="bw-btn"> + </ToggleGroupItem>
            </ToggleGroupRoot>
          </div>

          <div v-if="wb.form.kind === 'scalar-multiply'" class="form-row">
            <label class="bw-label" for="bw-factor">Factor</label>
            <NumberFieldRoot v-model="wb.form.factor" :step="0.1" class="bw-numberfield">
              <NumberFieldDecrement class="bw-numberfield__btn"> − </NumberFieldDecrement>
              <NumberFieldInput id="bw-factor" class="bw-input" />
              <NumberFieldIncrement class="bw-numberfield__btn"> + </NumberFieldIncrement>
            </NumberFieldRoot>
          </div>
          <div v-else class="form-row">
            <label class="bw-label" for="bw-delta">Delta</label>
            <NumberFieldRoot v-model="wb.form.delta" :step="0.1" class="bw-numberfield">
              <NumberFieldDecrement class="bw-numberfield__btn"> − </NumberFieldDecrement>
              <NumberFieldInput id="bw-delta" class="bw-input" />
              <NumberFieldIncrement class="bw-numberfield__btn"> + </NumberFieldIncrement>
            </NumberFieldRoot>
          </div>

          <div class="form-row">
            <label class="bw-label" for="bw-seeds">Seeds</label>
            <NumberFieldRoot v-model="wb.form.seedCount" :min="1" :step="1" class="bw-numberfield">
              <NumberFieldDecrement class="bw-numberfield__btn"> − </NumberFieldDecrement>
              <NumberFieldInput id="bw-seeds" class="bw-input" />
              <NumberFieldIncrement class="bw-numberfield__btn"> + </NumberFieldIncrement>
            </NumberFieldRoot>
          </div>

          <div class="form-row">
            <label class="bw-label" for="bw-ticks">Ticks</label>
            <NumberFieldRoot v-model="wb.form.ticks" :min="1" :step="1" class="bw-numberfield">
              <NumberFieldDecrement class="bw-numberfield__btn"> − </NumberFieldDecrement>
              <NumberFieldInput id="bw-ticks" class="bw-input" />
              <NumberFieldIncrement class="bw-numberfield__btn"> + </NumberFieldIncrement>
            </NumberFieldRoot>
          </div>

          <div class="form-row form-row--inline">
            <label class="bw-check" for="bw-capture-series">
              <input id="bw-capture-series" v-model="wb.form.captureSeries" type="checkbox" />
              Capture trajectories
            </label>
          </div>
        </div>

        <div class="form-actions">
          <Button
            type="button"
            class="bw-btn bw-btn--primary"
            :disabled="!wb.canPerturb.value || wb.running.value"
            @click="wb.run()"
          >
            {{ wb.running.value ? 'Running…' : 'Run sensitivity' }}
          </Button>
          <Button
            type="button"
            class="bw-btn"
            :disabled="!wb.canPerturb.value || wb.running.value"
            @click="wb.commit()"
          >
            Commit to live
          </Button>
          <Button
            type="button"
            class="bw-btn bw-btn--ghost"
            :disabled="!wb.committed.value"
            @click="wb.discard()"
          >
            Discard
          </Button>
        </div>

        <div v-if="wb.committed.value" class="form-status">
          <span class="bw-badge">Live engine has uncommitted perturbation</span>
        </div>
        <div v-if="wb.error.value" class="form-error">
          {{ wb.error.value }}
        </div>
      </div>
    </section>

    <section class="bw-pane bw-pane--delta">
      <header class="bw-pane__header">Delta</header>
      <div class="bw-pane__body">
        <div v-if="wb.headline.value" class="delta-headline">
          <div class="delta-headline-metric">
            {{ wb.headline.value.metric }}
          </div>
          <div class="delta-headline-value">
            {{ formatPct(wb.headline.value.delta.relative) }}
          </div>
        </div>
        <div v-else-if="wb.running.value" class="delta-empty">
          Running… {{ wb.progress.value.completedRuns }} / {{ wb.progress.value.totalRuns }}
        </div>
        <div v-else class="delta-empty">No run yet.</div>

        <div v-if="wb.selectedTrajectory.value" class="delta-trajectory">
          <ToggleGroupRoot
            v-if="wb.seriesNames.value.length > 1"
            v-model="seriesModel"
            type="single"
            :roving-focus="true"
            class="series-toggle"
            aria-label="Charted resource"
          >
            <ToggleGroupItem
              v-for="name in wb.seriesNames.value"
              :key="name"
              :value="name"
              class="bw-btn series-toggle__item"
            >
              {{ name }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <TrajectoryChart :trajectory="wb.selectedTrajectory.value" />
        </div>

        <table v-if="wb.rows.value.length > 0" class="delta-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline</th>
              <th>Variant</th>
              <th>Δ abs</th>
              <th>Δ rel</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in wb.rows.value" :key="row.metric">
              <td>{{ row.metric }}</td>
              <td>{{ formatNumber(row.baselineAvg) }}</td>
              <td>{{ formatNumber(row.variantAvg) }}</td>
              <td>{{ formatNumber(row.delta.absolute) }}</td>
              <td>{{ formatPct(row.delta.relative) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.balance-workbench {
  display: grid;
  grid-template-columns: 280px 320px 1fr;
  gap: var(--gap);
  height: 100%;
  width: 100%;
  padding: var(--gap);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  box-sizing: border-box;
}

.bw-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.bw-pane__header {
  padding: var(--gap-sm) var(--gap);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.bw-pane__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--gap);
}

.picker-group {
  margin-bottom: var(--gap);
}

.picker-group-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.picker-empty {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 2px 6px;
  opacity: 0.7;
}

.picker-row {
  display: block;
  width: 100%;
  text-align: left;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  cursor: pointer;
  font-family: var(--font-mono);
}

.picker-row:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.picker-row[data-state='checked'] {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.bw-numberfield {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.bw-numberfield .bw-input {
  border: none;
  border-radius: 0;
  text-align: center;
  width: 5em;
  font-variant-numeric: tabular-nums;
}
.bw-numberfield__btn {
  padding: 0 8px;
  background: var(--color-surface);
  border: none;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
}
.bw-numberfield__btn:hover {
  background: var(--color-surface-hover);
}
.bw-numberfield__btn[data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.picker-actions {
  margin-top: var(--gap-sm);
  display: flex;
  justify-content: flex-end;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bw-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.form-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
  word-break: break-all;
}

.bw-input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  padding: 4px 8px;
  font-size: 12px;
  font-family: var(--font-mono);
}

.bw-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.kind-toggle {
  display: flex;
  gap: 6px;
}

.bw-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 4px 10px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
}

.bw-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.bw-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bw-btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-bg);
}

.bw-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.bw-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-bg);
}

.bw-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--color-text-muted);
}

.bw-btn--ghost:hover:not(:disabled) {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.form-actions {
  display: flex;
  gap: 6px;
  margin-top: var(--gap);
  flex-wrap: wrap;
}

.form-row--inline {
  flex-direction: row;
  align-items: center;
}

.bw-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.bw-check input {
  accent-color: var(--color-primary);
  cursor: pointer;
}

.form-status {
  margin-top: var(--gap-sm);
}

.bw-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-badge);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  font-size: 11px;
}

.form-error {
  margin-top: var(--gap-sm);
  color: var(--color-danger);
  font-size: 12px;
}

.delta-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.delta-headline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--gap-sm);
}

.delta-headline-metric {
  font-family: var(--font-mono);
  font-size: 12px;
}

.delta-headline-value {
  font-size: 18px;
  font-weight: 600;
}

.delta-trajectory {
  margin-bottom: var(--gap);
}

.series-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--gap-sm);
}

.series-toggle__item {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 8px;
}

.series-toggle__item[data-state='on'] {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-bg);
}

.delta-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  font-family: var(--font-mono);
}

.delta-table th,
.delta-table td {
  text-align: right;
  padding: 4px 6px;
  border-bottom: 1px solid var(--color-border);
}

.delta-table th:first-child,
.delta-table td:first-child {
  text-align: left;
}

.delta-table th {
  font-weight: 600;
  color: var(--color-text-muted);
}
</style>

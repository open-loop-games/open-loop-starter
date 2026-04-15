<script setup lang="ts">
import { computed } from 'vue';
import type { Analyzer, Engine, EngineModule } from 'open-loop-engine';
import type { PickerEntry } from 'open-loop-engine/harness';
import { useBalanceWorkbench } from '@/composables/useBalanceWorkbench';

const props = defineProps<{
  engine: Engine;
  modules: () => EngineModule[];
  tick?: (engine: Engine, dt: number) => void;
  analyzerPack?: (engine: Engine) => Analyzer[];
}>();

const wb = useBalanceWorkbench({
  engine: props.engine,
  modules: props.modules,
  ...(props.tick && { tick: props.tick }),
  ...(props.analyzerPack && { analyzerPack: props.analyzerPack }),
});

interface Group {
  key: string;
  title: string;
  entries: readonly PickerEntry[];
  disabled: boolean;
}

const groups = computed<Group[]>(() => {
  const snap = wb.snapshot.value;
  const skillEntries = snap.categories.filter(
    (e) => e.address.source === 'category' && e.address.category === 'skills',
  );
  const otherCategories = snap.categories.filter(
    (e) => !(e.address.source === 'category' && e.address.category === 'skills'),
  );
  return [
    { key: 'content', title: 'Content', entries: snap.content, disabled: false },
    { key: 'chains', title: 'Chains', entries: snap.chains, disabled: false },
    { key: 'categories', title: 'Categories', entries: otherCategories, disabled: false },
    { key: 'skills', title: 'Skills (unsupported in v1)', entries: skillEntries, disabled: true },
  ];
});

function isSelected(entry: PickerEntry): boolean {
  const sel = wb.selectedEntry.value;
  return sel !== null && sel.label === entry.label && sel.address.source === entry.address.source;
}

function pickEntry(entry: PickerEntry, disabled: boolean): void {
  if (disabled) return;
  wb.selectEntry(entry);
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
</script>

<template>
  <div class="balance-workbench">
    <section class="bw-pane bw-pane--picker">
      <header class="bw-pane__header">
        Picker
      </header>
      <div class="bw-pane__body">
        <div
          v-for="group in groups"
          :key="group.key"
          class="picker-group"
        >
          <div class="picker-group-title">
            {{ group.title }}
          </div>
          <div
            v-if="group.entries.length === 0"
            class="picker-empty"
          >
            — none —
          </div>
          <button
            v-for="entry in group.entries"
            :key="`${group.key}-${entry.label}`"
            type="button"
            class="picker-row"
            :class="{
              'picker-row--selected': isSelected(entry),
              'picker-row--disabled': group.disabled,
            }"
            :disabled="group.disabled"
            :title="group.disabled ? 'Skills perturbation is unsupported in v1' : entry.label"
            @click="pickEntry(entry, group.disabled)"
          >
            {{ entry.label }}
          </button>
        </div>
        <div class="picker-actions">
          <button
            type="button"
            class="bw-btn bw-btn--ghost"
            @click="wb.refreshPicker()"
          >
            Refresh
          </button>
        </div>
      </div>
    </section>

    <section class="bw-pane bw-pane--form">
      <header class="bw-pane__header">
        Perturbation
      </header>
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
            <div class="kind-toggle">
              <button
                type="button"
                class="bw-btn"
                :class="{ 'bw-btn--active': wb.form.kind === 'scalar-multiply' }"
                @click="wb.form.kind = 'scalar-multiply'"
              >
                ×
              </button>
              <button
                type="button"
                class="bw-btn"
                :class="{ 'bw-btn--active': wb.form.kind === 'scalar-add' }"
                @click="wb.form.kind = 'scalar-add'"
              >
                +
              </button>
            </div>
          </div>

          <div
            v-if="wb.form.kind === 'scalar-multiply'"
            class="form-row"
          >
            <label
              class="bw-label"
              for="bw-factor"
            >Factor</label>
            <input
              id="bw-factor"
              v-model.number="wb.form.factor"
              type="number"
              step="0.1"
              class="bw-input"
            >
          </div>
          <div
            v-else
            class="form-row"
          >
            <label
              class="bw-label"
              for="bw-delta"
            >Delta</label>
            <input
              id="bw-delta"
              v-model.number="wb.form.delta"
              type="number"
              step="0.1"
              class="bw-input"
            >
          </div>

          <div class="form-row">
            <label
              class="bw-label"
              for="bw-seeds"
            >Seeds</label>
            <input
              id="bw-seeds"
              v-model.number="wb.form.seedCount"
              type="number"
              min="1"
              class="bw-input"
            >
          </div>

          <div class="form-row">
            <label
              class="bw-label"
              for="bw-ticks"
            >Ticks</label>
            <input
              id="bw-ticks"
              v-model.number="wb.form.ticks"
              type="number"
              min="1"
              class="bw-input"
            >
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="bw-btn bw-btn--primary"
            :disabled="!wb.canPerturb.value || wb.running.value"
            @click="wb.run()"
          >
            {{ wb.running.value ? 'Running…' : 'Run sensitivity' }}
          </button>
          <button
            type="button"
            class="bw-btn"
            :disabled="!wb.canPerturb.value || wb.running.value"
            @click="wb.commit()"
          >
            Commit to live
          </button>
          <button
            type="button"
            class="bw-btn bw-btn--ghost"
            :disabled="!wb.committed.value"
            @click="wb.discard()"
          >
            Discard
          </button>
        </div>

        <div
          v-if="wb.committed.value"
          class="form-status"
        >
          <span class="bw-badge">Live engine has uncommitted perturbation</span>
        </div>
        <div
          v-if="wb.error.value"
          class="form-error"
        >
          {{ wb.error.value }}
        </div>
      </div>
    </section>

    <section class="bw-pane bw-pane--delta">
      <header class="bw-pane__header">
        Delta
      </header>
      <div class="bw-pane__body">
        <div
          v-if="wb.headline.value"
          class="delta-headline"
        >
          <div class="delta-headline-metric">
            {{ wb.headline.value.metric }}
          </div>
          <div class="delta-headline-value">
            {{ formatPct(wb.headline.value.delta.relative) }}
          </div>
        </div>
        <div
          v-else-if="wb.running.value"
          class="delta-empty"
        >
          Running… {{ wb.progress.value.completedRuns }} / {{ wb.progress.value.totalRuns }}
        </div>
        <div
          v-else
          class="delta-empty"
        >
          No run yet.
        </div>

        <table
          v-if="wb.rows.value.length > 0"
          class="delta-table"
        >
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
            <tr
              v-for="row in wb.rows.value"
              :key="row.metric"
            >
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

.picker-row--selected {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.picker-row--disabled {
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

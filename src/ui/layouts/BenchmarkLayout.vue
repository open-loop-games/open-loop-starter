<script setup lang="ts">
/**
 * Benchmark Harness layout — thin UI over `runner.ts`. Owns the button,
 * progress string, and results table. All timing logic lives in the
 * runner so it can be reused from a future Web Worker offload without
 * dragging Vue along.
 */
import { ref, shallowRef } from 'vue';
import {
  DEFAULT_CELLS,
  runCell,
  type CellStats,
} from '@/modules/mods/benchmark/runner';

const running = ref(false);
const progress = ref<string>('');
const rows = shallowRef<CellStats[]>([]);
const error = shallowRef<string | null>(null);

async function runBenchmark(): Promise<void> {
  if (running.value) return;
  running.value = true;
  error.value = null;
  rows.value = [];
  progress.value = 'starting…';

  try {
    await new Promise((r) => setTimeout(r, 0));
    const collected: CellStats[] = [];
    for (const cfg of DEFAULT_CELLS) {
      const row = await runCell(cfg, { onProgress: (m) => (progress.value = m) });
      collected.push(row);
      rows.value = [...collected];
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
    progress.value = '';
  }
}
</script>

<template>
  <div class="benchmark-layout">
    <header class="hud">
      <h2>Benchmark Harness</h2>
      <p class="muted">
        Per-tick wall clock of a booted Cookie Factory engine with Vue watchers flushed between ticks. Baseline: borglike roguelike runs at 0.13ms avg/tick.
      </p>
    </header>

    <div class="controls">
      <button
        class="btn-primary"
        :disabled="running"
        @click="runBenchmark"
      >
        {{ running ? 'Running…' : 'Run benchmark' }}
      </button>
      <span
        v-if="running"
        class="progress"
      >{{ progress }}</span>
    </div>

    <ul class="cell-legend muted">
      <li
        v-for="c in DEFAULT_CELLS"
        :key="c.name"
      >
        <code>{{ c.name }}</code>: {{ c.description }} (warmup {{ c.warmup }}, measured {{ c.ticks }})
      </li>
    </ul>

    <div
      v-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <table
      v-if="rows.length > 0"
      class="results"
    >
      <thead>
        <tr>
          <th>Cell</th>
          <th>Ticks</th>
          <th>Mean ms</th>
          <th>p50</th>
          <th>p95</th>
          <th>p99</th>
          <th>Max</th>
          <th>Total ms</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.name"
        >
          <td>{{ r.name }}</td>
          <td>{{ r.ticks }}</td>
          <td>{{ r.meanMs.toFixed(4) }}</td>
          <td>{{ r.p50.toFixed(4) }}</td>
          <td>{{ r.p95.toFixed(4) }}</td>
          <td>{{ r.p99.toFixed(4) }}</td>
          <td>{{ r.max.toFixed(4) }}</td>
          <td>{{ r.totalMs.toFixed(1) }}</td>
        </tr>
      </tbody>
    </table>

    <section
      v-for="r in rows"
      :key="`profile-${r.name}`"
      class="profile-section"
    >
      <h3
        v-if="r.profile && r.profile.entries.length > 0"
        class="profile-title"
      >
        <code>{{ r.name }}</code> — per-label attribution
      </h3>
      <table
        v-if="r.profile && r.profile.entries.length > 0"
        class="results profile"
      >
        <thead>
          <tr>
            <th>Label</th>
            <th>%</th>
            <th>Total ms</th>
            <th>Calls</th>
            <th>Avg µs</th>
            <th>p50 µs</th>
            <th>p95 µs</th>
            <th>p99 µs</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in r.profile.entries"
            :key="e.name"
            :class="{ denominator: e.name === 'tick.total' }"
          >
            <td>{{ e.name }}</td>
            <td>{{ e.pct.toFixed(1) }}</td>
            <td>{{ e.totalMs.toFixed(1) }}</td>
            <td>{{ e.calls }}</td>
            <td>{{ e.avgUs.toFixed(1) }}</td>
            <td>{{ e.p50Us.toFixed(0) }}</td>
            <td>{{ e.p95Us.toFixed(0) }}</td>
            <td>{{ e.p99Us.toFixed(0) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.benchmark-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
  padding: var(--gap-lg);
  max-width: 900px;
  margin: 0 auto;
}

.hud h2 {
  margin: 0 0 var(--gap-xs) 0;
}

.muted {
  color: var(--color-text-muted, #888);
  margin: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}

.progress {
  font-family: var(--font-mono, monospace);
  font-size: 0.85em;
}

.cell-legend {
  list-style: disc;
  padding-left: 1.25em;
  font-size: 0.85em;
}

.cell-legend code {
  font-family: var(--font-mono, monospace);
}

.error {
  color: var(--color-danger, #c33);
  font-family: var(--font-mono, monospace);
  white-space: pre-wrap;
}

.results {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono, monospace);
  font-size: 0.88em;
}

.results th,
.results td {
  text-align: right;
  padding: var(--gap-xs) var(--gap-sm);
  border-bottom: 1px solid var(--color-border, #333);
}

.results th:first-child,
.results td:first-child {
  text-align: left;
}

.results th {
  font-weight: 600;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.profile-title {
  font-size: 0.95em;
  margin: 0;
}

.profile-title code {
  font-family: var(--font-mono, monospace);
}

.results.profile tbody tr.denominator {
  font-weight: 600;
  border-top: 1px solid var(--color-border, #333);
}
</style>

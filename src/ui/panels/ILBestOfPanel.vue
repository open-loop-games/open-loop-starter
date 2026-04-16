<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';

const il = useModule(IdleLoopsKey);

const rows = computed(() => {
  const entries = il.bestOf.entries.value;
  return Object.entries(entries).map(([key, entry]) => ({
    key,
    empty: entry == null,
    value: entry ? format(entry.value) : '—',
    perSecond: entry ? format(entry.perSecond) + '/s' : '—',
    loopNumber: entry ? entry.loopNumber : null,
    elapsed: entry ? entry.elapsed.toFixed(1) + 's' : '—',
    stale: entry?.status !== 'valid' && !!entry,
  }));
});

const hasAny = computed(() => rows.value.some((r) => !r.empty));

function metricLabel(key: string): string {
  if (key.endsWith('-xp')) {
    const stat = key.slice(0, -3).toUpperCase();
    return `${stat} XP`;
  }
  return key;
}

void Decimal; // keep import side-effect — format uses Decimal-source inputs
</script>

<template>
  <section class="il-panel">
    <header class="il-panel__header">
      <h3>Best Runs</h3>
    </header>
    <table
      v-if="hasAny"
      class="il-panel__table"
    >
      <thead>
        <tr>
          <th>Metric</th>
          <th>Best</th>
          <th>Rate</th>
          <th>Loop</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          :class="{ empty: row.empty, stale: row.stale }"
        >
          <td>{{ metricLabel(row.key) }}</td>
          <td>{{ row.value }}</td>
          <td>{{ row.perSecond }}</td>
          <td>{{ row.loopNumber ?? '—' }}</td>
          <td>{{ row.elapsed }}</td>
        </tr>
      </tbody>
    </table>
    <p
      v-else
      class="il-panel__empty"
    >
      No runs recorded yet.
    </p>
  </section>
</template>

<style scoped>
.il-panel {
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.il-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--gap-sm, 8px);
}
.il-panel__header h3 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}
.il-panel__table th,
.il-panel__table td {
  padding: 4px 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.il-panel__table th {
  font-size: 0.72em;
  text-transform: uppercase;
  color: var(--color-text-muted, var(--color-muted));
  letter-spacing: 0.05em;
}
.il-panel__table tr.empty td {
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__table tr.stale td {
  opacity: 0.55;
}
.il-panel__empty {
  margin: 0;
  padding: var(--gap-sm, 8px);
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-muted));
}
</style>

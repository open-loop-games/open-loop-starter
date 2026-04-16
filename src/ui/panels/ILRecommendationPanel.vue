<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';

const il = useModule(IdleLoopsKey);

const rec = computed(() => il.recommendations.lastRecommendation.value);
const autoApply = computed(() => il.recommendations.autoApply.value);

const metrics = computed(() => {
  const r = rec.value;
  if (!r) return [];
  return Object.entries(r.rationale.metrics).map(([key, m]) => {
    const delta = new Decimal(m.delta);
    const sign = delta.gt(0) ? 'positive' : delta.lt(0) ? 'negative' : 'zero';
    return {
      key,
      current: format(m.current),
      projected: format(m.projected),
      delta: format(delta),
      sign,
    };
  });
});

function onApply() {
  il.recommendations.apply();
}

function onDismiss() {
  il.recommendations.dismiss();
}
</script>

<template>
  <section
    v-if="rec"
    class="il-panel"
  >
    <header class="il-panel__header">
      <h3>Last Recommendation</h3>
      <span class="il-panel__strategy">{{ rec.strategyId }}</span>
    </header>
    <p class="il-panel__summary">
      {{ rec.rationale.summary }}
    </p>
    <table
      v-if="metrics.length"
      class="il-panel__metrics"
    >
      <thead>
        <tr>
          <th>Metric</th>
          <th>Current</th>
          <th>Projected</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="m in metrics"
          :key="m.key"
        >
          <td>{{ m.key }}</td>
          <td>{{ m.current }}</td>
          <td>{{ m.projected }}</td>
          <td :class="['delta', m.sign]">
            {{ m.delta }}
          </td>
        </tr>
      </tbody>
    </table>
    <div class="il-panel__actions">
      <button
        v-if="!autoApply && !rec.applied"
        class="btn-sm primary"
        type="button"
        @click="onApply"
      >
        Apply
      </button>
      <span
        v-else-if="rec.applied"
        class="il-panel__applied"
      >Applied</span>
      <button
        class="btn-sm"
        type="button"
        @click="onDismiss"
      >
        Dismiss
      </button>
    </div>
  </section>
</template>

<style scoped>
.il-panel {
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm, 8px);
}
.il-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.il-panel__header h3 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__strategy {
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-muted));
  font-family: var(--font-mono, monospace);
}
.il-panel__summary {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.4;
}
.il-panel__metrics {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8em;
}
.il-panel__metrics th,
.il-panel__metrics td {
  padding: 3px 6px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.il-panel__metrics th {
  font-size: 0.7em;
  text-transform: uppercase;
  color: var(--color-text-muted, var(--color-muted));
}
.delta.positive {
  color: var(--color-success, #4a9d5b);
}
.delta.negative {
  color: var(--color-danger, #d45454);
}
.delta.zero {
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__actions {
  display: flex;
  gap: var(--gap-sm, 8px);
  align-items: center;
}
.il-panel__applied {
  font-size: 0.8em;
  color: var(--color-success, #4a9d5b);
}
.btn-sm {
  padding: 3px 10px;
  font-size: 0.85em;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}
.btn-sm.primary {
  background: var(--color-accent, #4a6cf7);
  color: var(--color-accent-text, #fff);
  border-color: transparent;
}
.btn-sm:hover {
  filter: brightness(1.1);
}
</style>

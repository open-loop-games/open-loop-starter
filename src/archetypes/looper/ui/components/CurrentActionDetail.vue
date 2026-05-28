<script setup lang="ts">
/**
 * CurrentActionDetail — replaces NextActionList inside the 65% right region
 * when a current-list row is hovered. Shows per-action execution detail for
 * the hovered active-queue item.
 *
 * Reference: idle-loops-ng/src/ui/components/CurrentActionDetail.vue,
 * idle-loops-omsi/views/main.view.js:400-469 `mouseoverAction()` /
 * `updateCurrentActionBar()`. Displays: action name, mana orig/used/
 * remaining, gold remaining, time spent, per-stat EXP gains, and (on error)
 * failed attempts + error message.
 */

import { computed } from 'vue';
import { Decimal, formatWhole, formatTime, toNumber } from '@open-loop/engine';
import { getActionDef, getActiveList } from '../../modules/action-runner';
import { computeAdjustedTicks } from '../../modules/action-formulas';

const props = defineProps<{ index: number | null }>();

const item = computed(() => {
  if (props.index === null) return null;
  return getActiveList()[props.index] ?? null;
});

const def = computed(() => {
  const id = item.value?.id;
  return id ? getActionDef(id) : null;
});

const name = computed(() => def.value?.name ?? item.value?.id ?? '—');

// Engine `progress` slot is `number | Record<string, number>`; the active
// dispatcher writes named bars (`ticks`/`timeSpent`/`manaUsed`/`goldRemaining`).
// Pre-first-tick the slot is the initial `0` number — read defensively.
function progressBar(it: typeof item.value, key: string): number {
  if (!it) return 0;
  const p = it.metadata.progress;
  if (typeof p === 'number') return 0;
  return p[key] ?? 0;
}

const manaOrig = computed(() => {
  if (!def.value || !item.value) return '—';
  const adjusted = computeAdjustedTicks(def.value);
  return formatWhole(Decimal.mul(adjusted, item.value.metadata.payload.loops));
});

const manaUsed = computed(() =>
  item.value ? formatWhole(progressBar(item.value, 'manaUsed')) : '—',
);

const manaRemaining = computed(() => {
  if (!def.value || !item.value) return '—';
  const adjusted = computeAdjustedTicks(def.value);
  const total = Decimal.mul(adjusted, item.value.metadata.payload.loops);
  return formatWhole(Decimal.max(0, Decimal.sub(total, progressBar(item.value, 'manaUsed'))));
});

const goldRemaining = computed(() =>
  item.value ? formatWhole(progressBar(item.value, 'goldRemaining')) : '—',
);

const timeSpent = computed(() =>
  item.value ? formatTime(progressBar(item.value, 'timeSpent')) : '—',
);

/**
 * Per-stat XP actually accumulated on this item this loop (reference:
 * actions.js:263 `action.statExp${stat}`). We list every stat the def grants
 * weight to so the row count is stable; empty slots render as 0.
 */
const statExpRows = computed<Array<{ name: string; value: string }>>(() => {
  if (!def.value || !item.value) return [];
  const statExp = item.value.metadata.payload.statExp as Record<string, number | undefined>;
  return Object.entries(def.value.weights)
    .filter(([, w]) => w && toNumber(w) > 0)
    .map(([s]) => ({
      name: s,
      value: formatWhole(statExp[s] ?? 0),
    }));
});

const hasError = computed(() => Boolean(item.value?.metadata.error));
const errorMessage = computed(() => item.value?.metadata.error?.message ?? '');
const failedCount = computed(() => item.value?.metadata.attempt ?? 0);
</script>

<template>
  <div
    v-if="item"
    class="cad"
  >
    <div class="cad-name">
      {{ name }}
    </div>

    <div class="cad-row">
      <span>Mana (total)</span><b>{{ manaOrig }}</b>
    </div>
    <div class="cad-row">
      <span>Mana used</span><b>{{ manaUsed }}</b>
    </div>
    <div class="cad-row">
      <span>Mana remaining</span><b>{{ manaRemaining }}</b>
    </div>
    <div class="cad-row">
      <span>Gold remaining</span><b>{{ goldRemaining }}</b>
    </div>
    <div class="cad-row">
      <span>Time spent</span><b>{{ timeSpent }}</b>
    </div>

    <div
      v-if="statExpRows.length"
      class="cad-stats"
    >
      <span
        v-for="sx in statExpRows"
        :key="sx.name"
        class="cad-stat"
      >
        <b>{{ sx.name }}</b> {{ sx.value }}
      </span>
    </div>

    <div
      v-if="hasError"
      class="cad-error"
    >
      <div class="cad-row">
        <span>Failed attempts</span><b>{{ failedCount }}</b>
      </div>
      <div class="cad-row">
        <span>Error</span><b>{{ errorMessage }}</b>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cad {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  font-size: 0.78em;
}

.cad-name {
  text-align: center;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.cad-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.cad-row span {
  color: var(--color-text-muted);
  font-weight: 600;
}

.cad-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
}

.cad-stat {
  white-space: nowrap;
}

.cad-error {
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.cad-error .cad-row span {
  color: var(--color-danger);
}
</style>

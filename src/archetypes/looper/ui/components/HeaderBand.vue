<script setup lang="ts">
/**
 * HeaderBand — in-game header strip above the three-column game body.
 *
 *   Row 1 — thin loop-progress bar (shrinks as mana drains)
 *   Row 2 — tracked resources | loop# | pause/play · restart · toggles
 *
 * Save / Settings live in the starter's SystemHeader (above this bar);
 * Restart uses a reka Dialog confirm owned here.
 */

import { ref, computed } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from 'reka-ui';
import AppTooltip from './AppTooltip.vue';
import { Decimal, formatWhole } from 'open-loop-engine';
import {
  isLoopRunning,
  togglePause,
  manualRestart,
  getLoopCount,
  getPauseBeforeRestart,
  getPauseOnFailedLoop,
} from '../../modules/loop';
import { getManaValue, getTotalManaBudget } from '../../modules/mana';
import { useTrackedResources } from '../../composables/useTrackedResources';
import PanelLayout from '@/ui/components/PanelLayout.vue';

const { visibleResources, getResourceValue } = useTrackedResources();
const loopCount = getLoopCount();
const pauseBeforeRestart = getPauseBeforeRestart();
const pauseOnFailedLoop = getPauseOnFailedLoop();

const manaRemaining = computed(() => formatWhole(getManaValue()));
const manaBudget = computed(() => formatWhole(getTotalManaBudget()));

// Shrinks as mana drains — OMSI's `100 - timer/timeNeeded * 100` gives
// (mana/totalMana) * 100 in our model, where mana counts down to 0.
const timeBarPercent = computed(() => {
  const total = getTotalManaBudget();
  if (Decimal.lte(total, 0)) return 0;
  return Decimal.div(getManaValue(), total).clamp(0, 1).mul(100).toNumber();
});

const showRestartConfirm = ref(false);

function confirmRestart() {
  showRestartConfirm.value = false;
  manualRestart();
}

function formatResource(id: string): string {
  return formatWhole(getResourceValue(id as Parameters<typeof getResourceValue>[0]));
}
</script>

<template>
  <header class="header-band">
    <!-- Row 1: thin time bar -->
    <div class="time-bar-container">
      <div
        class="time-bar-fill"
        :style="{ width: timeBarPercent + '%' }"
      />
      <span class="time-bar-text">{{ manaRemaining }} / {{ manaBudget }} mana</span>
    </div>

    <!-- Row 2: tracked resources + controls -->
    <div class="header-row">
      <div class="tracked-resources">
        <AppTooltip
          v-for="def in visibleResources"
          :key="def.id"
        >
          <div class="tracked-resource">
            <strong class="tr-name">{{ def.name }}:</strong>
            <span class="tr-value">{{ formatResource(def.id) }}</span>
          </div>
          <template #content>
            {{ def.name }}
            <br>
            <em>Resets when the loop restarts.</em>
          </template>
        </AppTooltip>
        <span
          v-if="visibleResources.length === 0"
          class="tracked-empty"
        >
          No tracked resources yet.
        </span>
      </div>

      <div class="loop-count">
        Loop #{{ loopCount }}
      </div>

      <div class="time-controls">
        <button
          class="btn-sm"
          :class="isLoopRunning() ? 'btn-danger' : 'btn-primary'"
          @click="togglePause()"
        >
          {{ isLoopRunning() ? 'Pause' : 'Play' }}
        </button>
        <button
          class="btn-sm"
          @click="showRestartConfirm = true"
        >
          Restart
        </button>

        <AppTooltip text="Pause the loop before each automatic restart.">
          <label class="toggle">
            <input
              v-model="pauseBeforeRestart"
              type="checkbox"
            >
            <span>Pause before restart</span>
          </label>
        </AppTooltip>
        <AppTooltip text="Pause the loop after any action in the queue fails.">
          <label class="toggle">
            <input
              v-model="pauseOnFailedLoop"
              type="checkbox"
            >
            <span>Pause on failed loop</span>
          </label>
        </AppTooltip>
      </div>
    </div>

    <!-- Restart confirm dialog -->
    <DialogRoot v-model:open="showRestartConfirm">
      <DialogPortal>
        <DialogOverlay class="dialog-overlay" />
        <DialogContent class="dialog-content">
          <VisuallyHidden>
            <DialogTitle>Confirm Restart</DialogTitle>
            <DialogDescription>Manually restart the current loop</DialogDescription>
          </VisuallyHidden>
          <PanelLayout
            title="Restart loop?"
            @close="showRestartConfirm = false"
          >
            <div class="restart-body">
              <p>This ends the current loop immediately. Skills and talents persist.</p>
              <div class="restart-actions">
                <button
                  class="btn-sm"
                  @click="showRestartConfirm = false"
                >
                  Cancel
                </button>
                <button
                  class="btn-sm btn-danger"
                  @click="confirmRestart"
                >
                  Restart
                </button>
              </div>
            </div>
          </PanelLayout>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </header>
</template>

<style scoped>
.header-band {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

/* Row 1: thin time bar */
.time-bar-container {
  position: relative;
  height: 10px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;
}

.time-bar-fill {
  height: 100%;
  background: var(--progress-mana);
  transition: width 0.1s linear;
}

.time-bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68em;
  font-weight: 600;
  color: var(--color-text);
  mix-blend-mode: difference;
  pointer-events: none;
}

/* Row 2: resources + controls */
.header-row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  flex-wrap: wrap;
}

.tracked-resources {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  flex: 1 1 auto;
  min-width: 0;
}

.tracked-resource {
  display: inline-flex;
  gap: 4px;
  font-size: 0.85em;
  cursor: help;
}

.tr-name {
  color: var(--color-text-muted);
  font-weight: 700;
}

.tr-value {
  font-weight: 600;
  color: var(--color-text);
}

.tracked-empty {
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-style: italic;
}

.loop-count {
  font-size: 0.8em;
  color: var(--color-text-muted);
  flex: 0 0 auto;
}

.time-controls {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  flex: 0 0 auto;
  flex-wrap: wrap;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75em;
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}

.toggle input {
  width: 13px;
  height: 13px;
  cursor: pointer;
}

.btn-disabled-wrap {
  display: inline-flex;
}

/* Restart confirm body */
.restart-body {
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.restart-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap-sm);
}
</style>

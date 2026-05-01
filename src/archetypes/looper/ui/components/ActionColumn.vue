<script setup lang="ts">
/**
 * ActionColumn — center column shell for the action list area.
 *
 * Layout matches idle-loops-omsi reference (views/main.view.js:400-483,
 * index.html:215-250):
 *
 *   ┌── header: title + legend + total mana ───────────────────────────┐
 *   │                                                                  │
 *   │  ┌─ current list ─┐  ┌─ next list / hover-swap detail ───────┐   │
 *   │  │ 35%            │  │ 65%                                    │   │
 *   │  │ icon done/total│  │ zone-tinted edit rows                  │   │
 *   │  │ orange bar     │  │ (replaced by detail pane on hover)     │   │
 *   │  └────────────────┘  └────────────────────────────────────────┘   │
 *   │                                                                  │
 *   │  [amount: 1 | 5 | 10 | custom ]                                  │
 *   │  [ ] keep active  [ ] repeat last  [ ] add to top                │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Slim demo: no LoadoutBar (loadout substrate not in slim demo), no
 * adjustable list height (no settings.actionListHeight knob in the slim
 * looper). TODO(expansion): wire a persistent height knob if forks need
 * it — idle-loops-ng has it on a settings module.
 *
 * Reference: idle-loops-ng/src/ui/components/ActionColumn.vue.
 */

import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { formatWhole } from 'open-loop-engine';
import { useActionQueue } from '../../composables/useActionQueue';
import { useActionRunner } from '../../composables/useActionRunner';
import { useLoop } from '../../composables/useLoop';
import CurrentActionList from './CurrentActionList.vue';
import NextActionList from './NextActionList.vue';
import CurrentActionDetail from './CurrentActionDetail.vue';
import AppTooltip from './AppTooltip.vue';

const { repeatLastAction, addToTop, keepActiveLoopActive, queueAddAmount, clearActions } =
  useActionQueue();
const { calcTotalTicksNeeded } = useActionRunner();
const loop = useLoop();
const isPaused = computed(() => !loop.isLoopRunning());

const totalMana = computed(() => formatWhole(calcTotalTicksNeeded()));

// Template-friendly unwrapped reads
const amount = computed(() => queueAddAmount.value);

// ── Hover swap state ────────────────────────────────────────────────────────

const hoveredActiveIndex = ref<number | null>(null);

function onHover(index: number | null) {
  hoveredActiveIndex.value = index;
}

// ── Amount selector ─────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [1, 5, 10] as const;

function setAmount(n: number) {
  queueAddAmount.value = Math.max(1, Math.min(n, 1e12));
}

function onCustomInput(e: Event) {
  const val = +(e.target as HTMLInputElement).value;
  if (!Number.isFinite(val)) return;
  setAmount(val);
}
</script>

<template>
  <div class="action-column">
    <header class="ac-header">
      <h3 class="ac-title">
        Action List
        <AppTooltip>
          <span class="ac-legend">
            <Icon icon="mdi:information-outline" />
          </span>
          <template #content>
            <div><b>Current</b> list: executing actions.</div>
            <div><b>Next</b> list: your plan for the next loop.</div>
            <div>Hover a current row for details.</div>
          </template>
        </AppTooltip>
      </h3>
      <span class="ac-mana">{{ totalMana }} mana</span>
    </header>

    <div class="ac-split">
      <div class="ac-current">
        <CurrentActionList
          :hovered-index="hoveredActiveIndex"
          @hover="onHover"
        />
      </div>
      <div class="ac-next">
        <CurrentActionDetail
          v-if="hoveredActiveIndex !== null"
          :index="hoveredActiveIndex"
        />
        <NextActionList v-else />
      </div>
    </div>

    <div class="ac-amount">
      <span class="ac-amount-label">Amount</span>
      <button
        v-for="n in QUICK_AMOUNTS"
        :key="n"
        class="btn-sm"
        :class="{ 'btn-primary': amount === n }"
        @click="setAmount(n)"
      >
        {{ n }}
      </button>
      <input
        type="number"
        class="ac-amount-input"
        min="1"
        :value="amount"
        @change="onCustomInput"
      >
    </div>

    <div class="ac-toggles">
      <label class="ac-toggle">
        <input
          v-model="keepActiveLoopActive"
          type="checkbox"
        >
        Keep current list active
      </label>
      <label class="ac-toggle">
        <input
          v-model="repeatLastAction"
          type="checkbox"
        >
        Repeat last action
      </label>
      <label class="ac-toggle">
        <input
          v-model="addToTop"
          type="checkbox"
        >
        Add actions to top
      </label>
    </div>

    <!-- TODO(expansion): canonical idle-loops-ng moves these to HeaderBand;
         keep here until HeaderBand lands so play/pause/apply remain usable. -->
    <div class="ac-controls">
      <button
        class="btn-sm"
        :data-testid="isPaused ? 'queue-resume' : 'queue-pause'"
        @click="loop.togglePause"
      >
        {{ isPaused ? 'Resume' : 'Pause' }}
      </button>
      <button
        class="btn-sm"
        data-testid="queue-apply"
        @click="loop.manualRestart"
      >
        Apply now
      </button>
      <button
        class="btn-sm"
        data-testid="queue-clear"
        @click="clearActions"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-column {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  overflow: hidden;
  min-height: 0;
}

.ac-header {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  padding-bottom: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
}

.ac-title {
  font-size: 0.95em;
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
  margin: 0;
}

.ac-legend {
  color: var(--color-text-muted);
  cursor: help;
  font-size: 0.9em;
  display: inline-flex;
  align-items: center;
}

.ac-mana {
  font-size: 0.78em;
  color: var(--color-primary);
}

.ac-split {
  display: grid;
  grid-template-columns: 35% 65%;
  gap: 4px;
  min-height: 0;
  flex: 1;
}

.ac-current,
.ac-next {
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 3px;
}

.ac-current {
  background: rgba(194, 230, 204, 0.18);
}

.ac-next {
  background: rgba(205, 222, 210, 0.14);
}

.ac-amount {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ac-amount-label {
  font-size: 0.78em;
  color: var(--color-text-muted);
  margin-right: 4px;
}

.btn-sm {
  padding: 2px 8px;
  font-size: 0.78em;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-sm:hover {
  background: var(--color-surface-hover);
}

.btn-sm.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.ac-amount-input {
  width: 72px;
  padding: 2px 6px;
  font-size: 0.85em;
  margin-left: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.ac-amount-input::-webkit-inner-spin-button,
.ac-amount-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ac-amount-input[type='number'] {
  -moz-appearance: textfield;
}

.ac-toggles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--gap-sm);
  border-top: 1px solid var(--color-border);
}

.ac-toggle {
  font-size: 0.82em;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--color-text-muted);
}

.ac-toggle input[type='checkbox'] {
  accent-color: var(--color-primary);
}

.ac-controls {
  display: flex;
  gap: var(--gap-sm);
  padding-top: var(--gap-sm);
  border-top: 1px solid var(--color-border);
}
</style>

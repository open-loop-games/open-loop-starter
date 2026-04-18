<script setup lang="ts">
/**
 * Banked-time drawer. Collapsed state: a small "Offline »" button anchored
 * bottom-left. Expanded state: bank balance, enable/disable toggle, rate radio row.
 *
 * Renders nothing when the time-bank module isn't registered on the active engine —
 * keeps the surface invisible on games that don't opt in. Mounted as a sibling to
 * GameScreen in App.vue, not pushed through ModalStack (owns its own fixed chrome).
 */

import { computed, inject, ref } from 'vue';
import { formatTime, type Engine } from 'open-loop-engine';
import { useTimeBank } from '@/composables/useTimeBank';

const engine = inject<Engine>('engine');
const bank = engine ? useTimeBank(engine) : undefined;

const open = ref(false);

const bankLabel = computed(() => {
  if (!bank) return '';
  const ms = bank.bankMs.value;
  if (ms < 1000) return '0s';
  return formatTime(ms / 1000);
});

const toggleLabel = computed(() =>
  bank?.enabled.value ? 'Disable Bonus Speed' : 'Enable Bonus Speed',
);
</script>

<template>
  <template v-if="bank">
    <button v-if="!open" class="time-bank-handle" type="button" @click="open = true">
      Offline »
    </button>
    <div v-else class="time-bank-drawer">
      <button class="time-bank-close" type="button" @click="open = false">«</button>

      <button
        class="time-bank-toggle"
        :class="{ 'time-bank-toggle--on': bank.enabled.value }"
        type="button"
        @click="bank.toggle()"
      >
        {{ toggleLabel }}
      </button>

      <div class="time-bank-balance">
        Bonus Time: <b>{{ bankLabel }}</b>
      </div>

      <div class="time-bank-rates">
        <span class="time-bank-rates-label">Bonus Speed:</span>
        <label v-for="r in bank.rates" :key="r" class="time-bank-rate">
          <input
            type="radio"
            name="time-bank-rate"
            :value="r"
            :checked="bank.rate.value === r"
            @change="bank.setRate(r)"
          />
          {{ r }}x
        </label>
      </div>
    </div>
  </template>
</template>

<style scoped>
.time-bank-handle {
  position: fixed;
  bottom: 50px;
  left: 10px;
  z-index: 40;
  padding: 8px 13px;
  font-size: 14px;
  border: 1px solid var(--color-border, #2a2a3a);
  background: var(--color-surface, rgba(10, 10, 20, 0.88));
  color: var(--color-text, #cdd);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}

.time-bank-drawer {
  position: fixed;
  bottom: 55px;
  left: 20px;
  z-index: 40;
  width: 240px;
  padding: 12px;
  border: 1px solid var(--color-border, #2a2a3a);
  background: var(--color-surface, rgba(10, 10, 20, 0.95));
  color: var(--color-text, #cdd);
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-bank-close {
  position: absolute;
  top: -13px;
  right: -4px;
  padding: 3px 8px;
  font-size: 13px;
  border: 1px solid var(--color-border, #2a2a3a);
  background: var(--color-surface, rgba(10, 10, 20, 0.95));
  color: var(--color-text, #cdd);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}

.time-bank-toggle {
  padding: 8px;
  background: var(--color-danger, #9a2a2a);
  color: var(--color-text, #eef);
  border: 1px solid var(--color-border, #2a2a3a);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
}
.time-bank-toggle--on {
  background: var(--color-success, #2a7a3a);
}

.time-bank-balance {
  font-size: 13px;
}

.time-bank-rates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
}
.time-bank-rates-label {
  width: 100%;
  color: var(--color-text-muted, #889);
}
.time-bank-rate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
</style>

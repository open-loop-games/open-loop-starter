<script setup lang="ts">
import { ref, computed } from 'vue';
import Decimal from 'break_eternity.js';
import { demoState } from '@/modules/demo';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import AutosaveToast from '@/ui/components/AutosaveToast.vue';

const showSave = ref(false);
const showSettings = ref(false);

const state = demoState!;
const mana = computed(() => Decimal.floor(state.mana.value).toString());
const manaPercent = computed(() =>
  Decimal.div(state.mana.value, state.maxMana).mul(100).toNumber(),
);
const skillLevel = computed(() => state.woodcutting.level.value.toString());
const skillXp = computed(() => Decimal.floor(state.woodcutting.xp.value).toString());
const permanentBonus = computed(() =>
  Decimal.floor(state.woodcutting.permanentBonus!.value).toString(),
);
const loopCount = computed(() => state.loop.count.value);
const elapsed = computed(() => Math.floor(state.loop.elapsed.value));

function startAction(id: string) {
  const action = state.actions.get(id);
  if (action && !action.active.value) {
    action.start();
  }
}

function cancelAction(id: string) {
  const action = state.actions.get(id);
  if (action && action.active.value) {
    action.cancel();
  }
}

function endLoop() {
  state.loop.end();
}
</script>

<template>
  <div class="game-screen">
    <header class="game-header">
      <h2>Village</h2>
      <div class="header-actions">
        <button class="btn-sm" @click="showSave = true">Save</button>
        <button class="btn-sm" @click="showSettings = true">Settings</button>
      </div>
    </header>

    <main class="game-content">
      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-label">Mana</span>
          <div class="mana-bar">
            <div class="mana-fill" :style="{ width: manaPercent + '%' }" />
            <span class="mana-text">{{ mana }} / {{ state.maxMana }}</span>
          </div>
        </div>
        <div class="stat">
          <span class="stat-label">Woodcutting</span>
          <span class="stat-value">Lv {{ skillLevel }} ({{ skillXp }} XP)</span>
        </div>
        <div class="stat">
          <span class="stat-label">Permanent Bonus</span>
          <span class="stat-value">+{{ permanentBonus }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Loop</span>
          <span class="stat-value">#{{ loopCount }} ({{ elapsed }}s)</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <h3>Actions</h3>
        <div class="action-list">
          <div v-for="[id, action] in state.actions" :key="id" class="action-card">
            <div class="action-info">
              <span class="action-name">{{ action.display }}</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: (action.percentComplete.value * 100) + '%' }"
                />
              </div>
            </div>
            <div class="action-controls">
              <button
                v-if="!action.active.value"
                class="btn-primary btn-sm"
                @click="startAction(id)"
              >
                Start
              </button>
              <button v-else class="btn-danger btn-sm" @click="cancelAction(id)">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loop control -->
      <div class="loop-section">
        <button class="btn-sm" @click="endLoop">End Loop Early</button>
        <p class="hint">Mana drains over time. When it hits 0, the loop resets. Skill bonus persists.</p>
      </div>
    </main>

    <SavePanel v-if="showSave" @close="showSave = false" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <AutosaveToast />
  </div>
</template>

<style scoped>
.game-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.game-header h2 {
  font-size: 1.1em;
}

.header-actions {
  display: flex;
  gap: var(--gap-sm);
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
  padding: var(--gap-lg);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* Stats */
.stats-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.8em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-weight: 600;
}

.mana-bar {
  position: relative;
  height: 24px;
  background: var(--color-bg);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.mana-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.1s linear;
}

.mana-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 600;
}

/* Actions */
.actions-section h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.action-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: var(--gap);
}

.action-name {
  font-weight: 600;
  font-size: 0.95em;
}

.progress-bar {
  height: 6px;
  background: var(--color-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.05s linear;
}

/* Loop */
.loop-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
  padding-top: var(--gap);
  border-top: 1px solid var(--color-border);
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.85em;
  text-align: center;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { coreState } from '@/modules/core';
import ProducersPanel from '@/ui/panels/ProducersPanel.vue';
import UpgradesPanel from '@/ui/panels/UpgradesPanel.vue';
import AchievementsPanel from '@/ui/panels/AchievementsPanel.vue';

const state = coreState!;

/**
 * Clicker-style: click big buttons to instantly start an action. In a real
 * clicker we'd use zero-duration actions, but reusing the base actions keeps
 * the "same core, different mod" story honest. Clicking queues the action.
 */
const bigButtons = computed(() => {
  const visible: Array<{ id: string; label: string }> = [];
  for (const [id, action] of state.actions) {
    const zone = state.actionZones.get(id) ?? 'village';
    if (!state.zones.isUnlocked(zone)) continue;
    visible.push({ id, label: action.display.title as string });
  }
  return visible;
});

const wood = computed(() => format(Decimal.floor(state.resources.wood.value)));
const stone = computed(() => format(Decimal.floor(state.resources.stone.value)));
const gold = computed(() => format(Decimal.floor(state.resources.gold.value)));

function click(id: string) {
  const action = state.actions.get(id);
  if (!action) return;
  if (action.active.value) return;
  action.start();
}
</script>

<template>
  <div class="clicker-layout">
    <header class="hud">
      <div class="chip">
        🪵 {{ wood }}
      </div>
      <div class="chip">
        🪨 {{ stone }}
      </div>
      <div class="chip">
        🪙 {{ gold }}
      </div>
    </header>

    <div class="click-grid">
      <button
        v-for="b in bigButtons"
        :key="b.id"
        class="click-btn"
        @click="click(b.id)"
      >
        <span class="click-label">{{ b.label }}</span>
        <span class="click-sub">
          {{
            state.actions.get(b.id)!.active.value
              ? Math.floor(state.actions.get(b.id)!.percentComplete.value * 100) + '%'
              : 'Click!'
          }}
        </span>
      </button>
    </div>

    <div class="grid-2">
      <ProducersPanel />
      <UpgradesPanel />
    </div>

    <AchievementsPanel />
  </div>
</template>

<style scoped>
.clicker-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.hud {
  display: flex;
  gap: var(--gap-sm);
  justify-content: center;
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.chip {
  padding: 4px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-weight: 600;
}
.click-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--gap-sm);
}
.click-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--gap-lg);
  min-height: 90px;
  font-weight: 700;
  font-size: 1em;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: transform 0.05s;
}
.click-btn:hover {
  filter: brightness(1.1);
}
.click-btn:active {
  transform: scale(0.97);
}
.click-label {
  font-size: 1em;
}
.click-sub {
  font-size: 0.75em;
  font-weight: 500;
  opacity: 0.85;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
@media (max-width: 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
